import { forwardRef, Inject, INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayInit,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ClientToServerEvents, ServerToClientEvents } from '@ks/shared-types';
import Redis from 'ioredis';
import type { Namespace, Server, ServerOptions, Socket } from 'socket.io';
import { AuthService, type AccessTokenPayload } from '../auth/auth.service';
import { RoomsService, type GuestTokenPayload } from '../rooms/rooms.service';

interface SocketData {
  user?: AccessTokenPayload;
  guest?: GuestTokenPayload;
  rooms?: string[];
}
type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
const channel = (roomId: string) => `room:${roomId}`;

/**
 * Gateway de tiempo real. Solo eventos de control: el audio va por LiveKit.
 * Toda conexión se autentica en el handshake, con token de usuario o de invitado.
 */
@WebSocketGateway({ namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() private readonly nsp!: Namespace<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >;

  constructor(
    private readonly auth: AuthService,
    @Inject(forwardRef(() => RoomsService)) private readonly rooms: RoomsService,
  ) {}

  /**
   * Autenticación en el handshake (middleware): la conexión no se acepta hasta validar el
   * token, así ningún evento llega antes de conocer al usuario o invitado.
   */
  afterInit(nsp: Namespace): void {
    nsp.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
      if (!token) return next(new Error('Token requerido'));
      const data = socket.data as SocketData;
      data.rooms = [];
      try {
        data.user = this.auth.verifyAccessToken(token);
        return next();
      } catch {
        this.rooms
          .verifyGuest(token)
          .then((guest) => {
            data.guest = guest;
            next();
          })
          .catch(() => next(new Error('Token inválido')));
      }
    });
  }

  async handleDisconnect(client: AppSocket): Promise<void> {
    if (client.data.guest) await this.rooms.touch(client.data.guest.sub);
    for (const roomId of client.data.rooms ?? []) await this.broadcastPresence(roomId);
  }

  @SubscribeMessage('clock:sync')
  clockSync(): { serverTime: number } {
    return { serverTime: Date.now() };
  }

  @SubscribeMessage('room:join')
  async roomJoin(
    @ConnectedSocket() client: AppSocket,
    @MessageBody() body: { roomId?: string },
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    const roomId = String(body?.roomId ?? '');
    try {
      if (client.data.guest) {
        if (client.data.guest.roomId !== roomId) throw new Error('forbidden');
      } else if (client.data.user) {
        await this.rooms.roleInRoom(client.data.user.sub, roomId);
      } else throw new Error('unauthenticated');
    } catch {
      return { ok: false, message: 'Sin acceso a esta sala' };
    }
    await client.join(channel(roomId));
    client.data.rooms = [...new Set([...(client.data.rooms ?? []), roomId])];
    await this.broadcastPresence(roomId);
    return { ok: true };
  }

  /** Lista de participantes con su estado en línea (sockets presentes en la sala, en cualquier instancia). */
  async broadcastPresence(roomId: string): Promise<void> {
    const sockets = await this.nsp.in(channel(roomId)).fetchSockets();
    const online = new Set(
      sockets.map((s) => s.data.guest?.sub).filter((id): id is string => Boolean(id)),
    );
    const participants = await this.rooms.participants(roomId, online);
    this.nsp.to(channel(roomId)).emit('presence:update', { roomId, participants });
  }

  /** Aviso ligero: los clientes vuelven a pedir la cola por REST. */
  queueUpdated(roomId: string, version: number): void {
    this.nsp.to(channel(roomId)).emit('queue:update', { roomId, version });
  }

  async roomClosed(roomId: string): Promise<void> {
    this.nsp.to(channel(roomId)).emit('room:closed', { roomId });
    this.nsp.in(channel(roomId)).disconnectSockets(false);
  }
}

/**
 * Adaptador Socket.IO respaldado en Redis: permite varias instancias de la API
 * (escalado horizontal) compartiendo salas y emisiones.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: Redis[] = [];

  constructor(
    app: INestApplicationContext,
    private readonly corsOrigins: string[],
  ) {
    super(app);
  }

  async connect(redisUrl: string): Promise<void> {
    const pub = new Redis(redisUrl);
    const sub = pub.duplicate();
    this.clients = [pub, sub];
    this.adapterConstructor = createAdapter(pub, sub);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, {
      ...options,
      cors: { origin: this.corsOrigins, credentials: true },
    });
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }

  async close(): Promise<void> {
    await Promise.all(this.clients.map((c) => c.quit().catch(() => undefined)));
  }
}
