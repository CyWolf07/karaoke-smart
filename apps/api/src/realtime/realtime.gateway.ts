import { INestApplicationContext, Logger, Module } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { OnGatewayConnection, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import type { ClientToServerEvents, ServerToClientEvents } from '@ks/shared-types';
import Redis from 'ioredis';
import type { Server, ServerOptions, Socket } from 'socket.io';
import { AuthService, type AccessTokenPayload } from '../auth/auth.service';

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  { user?: AccessTokenPayload }
>;

/**
 * Gateway de tiempo real. Solo eventos de control: el audio va por LiveKit.
 * Toda conexión debe autenticarse en el handshake.
 */
@WebSocketGateway({ namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(private readonly auth: AuthService) {}

  handleConnection(client: AppSocket): void {
    const token = (client.handshake.auth as { token?: string } | undefined)?.token;
    try {
      if (!token) throw new Error('missing token');
      client.data.user = this.auth.verifyAccessToken(token);
    } catch {
      client.emit('error', { statusCode: 401, error: 'Unauthorized', message: 'Token inválido' });
      client.disconnect(true);
      return;
    }
    this.logger.debug(`Conectado ${client.id} (${client.data.user.sub})`);
  }

  @SubscribeMessage('clock:sync')
  clockSync(): { serverTime: number } {
    return { serverTime: Date.now() };
  }
}

@Module({ providers: [RealtimeGateway] })
export class RealtimeModule {}

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
