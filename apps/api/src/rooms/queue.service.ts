import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { QueueDto, QueueItemDto, Role, SearchResultDto } from '@ks/shared-types';
import type { Prisma } from '@prisma/client';
import { AuthService } from '../auth/auth.service';
import type { Env } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { RoomsService } from './rooms.service';

const MANAGE_ROLES: Role[] = ['owner', 'admin', 'host'];
/** Canciones pendientes que puede tener a la vez cada invitado. */
export const MAX_PENDING_PER_GUEST = 3;

export type Actor =
  | { kind: 'member'; userId: string; canManage: boolean; organizationId: string }
  | { kind: 'guest'; participantId: string; organizationId: string };

const itemInclude = {
  track: true,
  requestedBy: { select: { id: true, nickname: true } },
} satisfies Prisma.QueueItemInclude;
type ItemRow = Prisma.QueueItemGetPayload<{ include: typeof itemInclude }>;

function toItem(i: ItemRow): QueueItemDto {
  return {
    id: i.id,
    status: i.status,
    position: i.position,
    track: {
      provider: i.track.provider,
      externalId: i.track.externalId,
      title: i.track.title,
      artist: i.track.artist,
      coverUrl: i.track.coverUrl,
    },
    requestedBy: i.requestedBy,
  };
}

/**
 * Cola colaborativa de la sala. Fuente de reproducción: YouTube (reproductor oficial
 * incrustado). Los datos del vídeo se obtienen siempre del servidor (oEmbed), nunca del cliente.
 */
@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly rooms: RoomsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Identifica a quien llama: miembro de la organización o invitado de esta sala. */
  async actor(token: string | undefined, roomId: string): Promise<Actor> {
    if (!token) throw new UnauthorizedException('Token requerido');
    let userId: string | null = null;
    try {
      userId = this.auth.verifyAccessToken(token).sub;
    } catch {
      /* no es un token de usuario: se prueba como invitado */
    }
    if (userId) {
      const { room, role } = await this.rooms.roleInRoom(userId, roomId);
      return {
        kind: 'member',
        userId,
        canManage: MANAGE_ROLES.includes(role),
        organizationId: room.organizationId,
      };
    }
    const guest = await this.rooms.verifyGuest(token);
    if (guest.roomId !== roomId) throw new NotFoundException('Sala no encontrada');
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    return { kind: 'guest', participantId: guest.sub, organizationId: room.organizationId };
  }

  async get(roomId: string): Promise<QueueDto> {
    const [room, items] = await Promise.all([
      this.prisma.room.findUniqueOrThrow({ where: { id: roomId }, select: { queueVersion: true } }),
      this.prisma.queueItem.findMany({
        where: { roomId, status: { in: ['pending', 'playing'] } },
        orderBy: { position: 'asc' },
        include: itemInclude,
      }),
    ]);
    const current = items.find((i) => i.status === 'playing');
    return {
      roomId,
      version: room.queueVersion,
      current: current ? toItem(current) : null,
      upcoming: items.filter((i) => i.status === 'pending').map(toItem),
    };
  }

  async add(roomId: string, actor: Actor, videoId: string): Promise<QueueDto> {
    const room = await this.prisma.room.findUniqueOrThrow({ where: { id: roomId } });
    if (room.status !== 'open') throw new ForbiddenException('La sala está cerrada');
    if (actor.kind === 'guest') {
      const mine = await this.prisma.queueItem.count({
        where: { roomId, requestedById: actor.participantId, status: 'pending' },
      });
      if (mine >= MAX_PENDING_PER_GUEST)
        throw new ForbiddenException(
          `Ya tienes ${MAX_PENDING_PER_GUEST} canciones en espera; pide otra cuando suene una.`,
        );
    }
    const info = await this.oembed(videoId);
    const track = await this.prisma.track.upsert({
      where: {
        organizationId_provider_externalId: {
          organizationId: actor.organizationId,
          provider: 'youtube',
          externalId: videoId,
        },
      },
      update: { title: info.title, artist: info.artist, coverUrl: info.coverUrl },
      create: {
        organizationId: actor.organizationId,
        provider: 'youtube',
        externalId: videoId,
        title: info.title,
        artist: info.artist,
        coverUrl: info.coverUrl,
        isKaraoke: /karaoke|instrumental/i.test(info.title),
      },
    });
    await this.prisma.$transaction(async (tx) => {
      const last = await tx.queueItem.aggregate({ where: { roomId }, _max: { position: true } });
      await tx.queueItem.create({
        data: {
          roomId,
          trackId: track.id,
          requestedById: actor.kind === 'guest' ? actor.participantId : null,
          position: (last._max.position ?? 0) + 1,
        },
      });
      await tx.room.update({ where: { id: roomId }, data: { queueVersion: { increment: 1 } } });
    });
    return this.get(roomId);
  }

  async remove(roomId: string, actor: Actor, itemId: string): Promise<QueueDto> {
    const item = await this.prisma.queueItem.findFirst({ where: { id: itemId, roomId } });
    if (!item || !['pending', 'playing'].includes(item.status))
      throw new NotFoundException('La canción ya no está en la cola');
    const own = actor.kind === 'guest' && item.requestedById === actor.participantId;
    const manager = actor.kind === 'member' && actor.canManage;
    if (!manager && !(own && item.status === 'pending'))
      throw new ForbiddenException('Solo puedes quitar tus propias canciones en espera');
    await this.prisma.$transaction([
      this.prisma.queueItem.update({ where: { id: itemId }, data: { status: 'removed' } }),
      this.prisma.room.update({ where: { id: roomId }, data: { queueVersion: { increment: 1 } } }),
    ]);
    return this.get(roomId);
  }

  /**
   * Pasa a la siguiente canción. `fromItemId` es la canción que el reproductor acaba de
   * terminar: si ya no es la actual (otra pantalla avanzó antes), no se avanza dos veces.
   */
  async advance(
    roomId: string,
    actor: Actor,
    fromItemId: string | null | undefined,
  ): Promise<QueueDto> {
    if (actor.kind !== 'member' || !actor.canManage)
      throw new ForbiddenException('Solo el anfitrión controla la reproducción');
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.queueItem.findFirst({ where: { roomId, status: 'playing' } });
      if (fromItemId !== undefined && (current?.id ?? null) !== fromItemId) return;
      if (current)
        await tx.queueItem.update({ where: { id: current.id }, data: { status: 'played' } });
      const next = await tx.queueItem.findFirst({
        where: { roomId, status: 'pending' },
        orderBy: { position: 'asc' },
      });
      if (next) await tx.queueItem.update({ where: { id: next.id }, data: { status: 'playing' } });
      await tx.room.update({ where: { id: roomId }, data: { queueVersion: { increment: 1 } } });
    });
    return this.get(roomId);
  }

  /** Búsqueda con YouTube Data API v3 (solo vídeos que se pueden incrustar). */
  async search(q: string): Promise<SearchResultDto[]> {
    const key = this.config.get('YOUTUBE_API_KEY', { infer: true });
    if (!key)
      throw new ServiceUnavailableException(
        'La búsqueda no está configurada: pega el enlace de YouTube de la canción.',
      );
    const query = q.trim();
    if (query.length < 2) throw new BadRequestException('Escribe al menos 2 caracteres');
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.search = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      maxResults: '12',
      safeSearch: 'moderate',
      q: query,
      key,
    }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new ServiceUnavailableException('YouTube no respondió a la búsqueda');
    const data = (await res.json()) as {
      items: {
        id: { videoId: string };
        snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } } };
      }[];
    };
    return data.items.map((i) => ({
      externalId: i.id.videoId,
      title: decodeEntities(i.snippet.title),
      channel: decodeEntities(i.snippet.channelTitle),
      thumbnail: i.snippet.thumbnails?.medium?.url ?? null,
    }));
  }

  /** Datos públicos del vídeo sin API key. Falla si el vídeo no existe o es privado. */
  private async oembed(videoId: string) {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}`;
    let res: Response;
    try {
      res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    } catch {
      throw new ServiceUnavailableException('No se pudo consultar YouTube');
    }
    if (!res.ok)
      throw new BadRequestException('Ese vídeo no existe, es privado o no se puede incrustar');
    const d = (await res.json()) as { title: string; author_name: string; thumbnail_url?: string };
    return {
      title: d.title.slice(0, 200),
      artist: d.author_name.slice(0, 120),
      coverUrl: d.thumbnail_url ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  }
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
