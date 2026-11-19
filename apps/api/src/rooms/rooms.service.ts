import {
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { GuestSession, PresenceParticipant, Role, RoomDto } from '@ks/shared-types';
import { JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH, type JoinRoomInput } from '@ks/validation';
import type { Room } from '@prisma/client';
import Redis from 'ioredis';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { REDIS } from '../redis/redis.module';

/** Validez del código de unión (y del token de invitado emitido con él). */
export const JOIN_CODE_TTL_SECONDS = 24 * 60 * 60;
const MANAGE_ROLES: Role[] = ['owner', 'admin', 'host'];

export interface GuestTokenPayload {
  sub: string; // participantId
  roomId: string;
  nickname: string;
  typ: 'guest';
}

const hashCode = (c: string) => createHash('sha256').update(c).digest('hex');
const codeKey = (roomId: string) => `room:${roomId}:code`;

function generateCode(): string {
  let s = '';
  for (let i = 0; i < JOIN_CODE_LENGTH; i++)
    s += JOIN_CODE_ALPHABET[randomInt(JOIN_CODE_ALPHABET.length)];
  return s;
}

/**
 * Salas y acceso de invitados. El código se guarda hasheado en la base de datos (búsqueda)
 * y en claro solo en Redis con TTL, para que la pantalla pueda volver a mostrarlo.
 */
@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Rol del usuario en la organización dueña de la sala; 404 si no es miembro. */
  async roleInRoom(userId: string, roomId: string): Promise<{ room: Room; role: Role }> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Sala no encontrada');
    const m = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: room.organizationId, userId } },
      include: { role: true },
    });
    if (!m) throw new NotFoundException('Sala no encontrada');
    return { room, role: m.role.key };
  }

  private async assertManager(userId: string, roomId: string): Promise<Room> {
    const { room, role } = await this.roleInRoom(userId, roomId);
    if (!MANAGE_ROLES.includes(role))
      throw new ForbiddenException('Sin permiso para gestionar la sala');
    return room;
  }

  async create(orgId: string, userId: string, role: Role, name: string): Promise<RoomDto> {
    if (!MANAGE_ROLES.includes(role)) throw new ForbiddenException('Sin permiso para crear salas');
    const room = await this.prisma.room.create({
      data: { organizationId: orgId, name, createdById: userId },
    });
    await this.rotateCode(room.id);
    return this.toDto(room.id);
  }

  async list(orgId: string): Promise<RoomDto[]> {
    const rooms = await this.prisma.room.findMany({
      where: { organizationId: orgId, status: 'open' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return Promise.all(rooms.map((r) => this.toDto(r.id)));
  }

  async get(userId: string, roomId: string): Promise<RoomDto> {
    await this.roleInRoom(userId, roomId);
    return this.toDto(roomId);
  }

  async regenerateCode(userId: string, roomId: string): Promise<RoomDto> {
    const room = await this.assertManager(userId, roomId);
    if (room.status !== 'open') throw new GoneException('La sala está cerrada');
    await this.rotateCode(roomId);
    return this.toDto(roomId);
  }

  async close(userId: string, roomId: string): Promise<RoomDto> {
    await this.assertManager(userId, roomId);
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'closed', closedAt: new Date(), joinCodeHash: null, joinCodeExpires: null },
    });
    await this.redis.del(codeKey(roomId));
    return this.toDto(roomId);
  }

  /** Entrada pública con código (escrito o leído del QR). */
  async join(input: JoinRoomInput): Promise<GuestSession> {
    const room = await this.prisma.room.findUnique({
      where: { joinCodeHash: hashCode(input.code) },
    });
    if (
      !room ||
      room.status !== 'open' ||
      !room.joinCodeExpires ||
      room.joinCodeExpires < new Date()
    )
      throw new NotFoundException('Código inválido o caducado');
    const active = await this.prisma.roomParticipant.count({
      where: { roomId: room.id, leftAt: null },
    });
    if (active >= room.maxParticipants) throw new ForbiddenException('La sala está llena');

    const participant = await this.prisma.roomParticipant.create({
      data: { roomId: room.id, nickname: input.nickname, role: 'participant' },
    });
    const ttl = Math.max(60, Math.floor((room.joinCodeExpires.getTime() - Date.now()) / 1000));
    const guestToken = await this.jwt.signAsync(
      {
        sub: participant.id,
        roomId: room.id,
        nickname: participant.nickname,
        typ: 'guest',
      } satisfies GuestTokenPayload,
      { expiresIn: ttl },
    );
    return {
      guestToken,
      room: { id: room.id, name: room.name },
      participant: { id: participant.id, nickname: participant.nickname },
    };
  }

  /** Valida un token de invitado y que el participante siga activo en una sala abierta. */
  async verifyGuest(token: string): Promise<GuestTokenPayload> {
    let payload: GuestTokenPayload;
    try {
      payload = this.jwt.verify<GuestTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido');
    }
    if (payload.typ !== 'guest') throw new UnauthorizedException('Token inválido');
    const p = await this.prisma.roomParticipant.findUnique({
      where: { id: payload.sub },
      include: { room: { select: { status: true } } },
    });
    if (!p || p.leftAt || p.isBlocked || p.room.status !== 'open')
      throw new UnauthorizedException('Ya no perteneces a esta sala');
    return payload;
  }

  async leave(participantId: string): Promise<void> {
    await this.prisma.roomParticipant.update({
      where: { id: participantId },
      data: { leftAt: new Date() },
    });
  }

  async touch(participantId: string): Promise<void> {
    await this.prisma.roomParticipant
      .update({ where: { id: participantId }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  async participants(roomId: string, onlineIds: Set<string>): Promise<PresenceParticipant[]> {
    const list = await this.prisma.roomParticipant.findMany({
      where: { roomId, leftAt: null, isBlocked: false },
      orderBy: { joinedAt: 'asc' },
      select: { id: true, nickname: true },
    });
    return list.map((p) => ({ ...p, online: onlineIds.has(p.id) }));
  }

  private async rotateCode(roomId: string): Promise<void> {
    const expires = new Date(Date.now() + JOIN_CODE_TTL_SECONDS * 1000);
    // Reintenta ante la (improbable) colisión con el código de otra sala.
    for (let i = 0; i < 5; i++) {
      const code = generateCode();
      try {
        await this.prisma.room.update({
          where: { id: roomId },
          data: { joinCodeHash: hashCode(code), joinCodeExpires: expires },
        });
        await this.redis.set(codeKey(roomId), code, 'EX', JOIN_CODE_TTL_SECONDS);
        return;
      } catch (e) {
        if ((e as { code?: string }).code !== 'P2002') throw e;
      }
    }
    throw new Error('No se pudo generar un código único');
  }

  private async toDto(roomId: string): Promise<RoomDto> {
    const room = await this.prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: { _count: { select: { participants: { where: { leftAt: null } } } } },
    });
    const valid =
      room.status === 'open' && room.joinCodeExpires && room.joinCodeExpires > new Date();
    const code = valid ? await this.redis.get(codeKey(roomId)) : null;
    return {
      id: room.id,
      name: room.name,
      status: room.status,
      createdAt: room.createdAt.toISOString(),
      participantCount: room._count.participants,
      joinCode: code,
      joinCodeExpiresAt: code && room.joinCodeExpires ? room.joinCodeExpires.toISOString() : null,
    };
  }
}
