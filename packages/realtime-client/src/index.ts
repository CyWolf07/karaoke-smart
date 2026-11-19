import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@ks/shared-types';

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Socket tipado con reconexión automática. El token se envía en el handshake y se
 * vuelve a leer en cada reconexión (permite refrescarlo).
 * Nota: el audio NO viaja por aquí; va por LiveKit (WebRTC).
 */
export function createRealtimeClient(url: string, getToken: () => string | null): RealtimeSocket {
  return io(`${url}/realtime`, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    auth: (cb) => cb({ token: getToken() }),
  });
}
