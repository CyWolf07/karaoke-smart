/** Contratos compartidos entre API, web, móvil y worker. */

export const ROLES = ['owner', 'admin', 'host', 'participant'] as const;
export type Role = (typeof ROLES)[number];

export type RoomStatus = 'open' | 'closed';
export type QueueItemStatus = 'pending' | 'playing' | 'played' | 'skipped';
export type PlaybackState = 'idle' | 'playing' | 'paused';
export type ProviderId = 'youtube' | 'spotify' | 'local';
export type DeviceKind = 'screen' | 'admin' | 'participant';

export interface UserDto {
  id: string;
  email: string;
  displayName: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: UserDto;
  organizations: OrganizationDto[];
}

export interface HealthResponse {
  status: 'ok' | 'error';
  checks: Record<string, { status: 'up' | 'down'; error?: string }>;
  version: string;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

/** Capacidades declaradas por cada proveedor musical (ver docs/07). */
export interface PlaybackCapabilities {
  search: boolean;
  fullPlayback: boolean;
  embeddedPlayer: boolean;
  lyrics: boolean;
  requiresUserAccount: boolean;
}

export interface PresenceParticipant {
  id: string;
  nickname: string;
  online: boolean;
}

export interface RoomDto {
  id: string;
  name: string;
  status: RoomStatus;
  createdAt: string;
  participantCount: number;
  /** Solo para miembros de la organización; null si caducó o la sala está cerrada. */
  joinCode: string | null;
  joinCodeExpiresAt: string | null;
}

export interface GuestSession {
  /** Token de invitado (JWT, válido mientras dure el código de la sala). */
  guestToken: string;
  room: { id: string; name: string };
  participant: { id: string; nickname: string };
}

/** Eventos tipados de Socket.IO. Servidor -> cliente. */
export interface ServerToClientEvents {
  'presence:update': (p: { roomId: string; participants: PresenceParticipant[] }) => void;
  'queue:update': (q: { roomId: string; version: number }) => void;
  'playback:state': (s: {
    roomId: string;
    state: PlaybackState;
    positionMs: number;
    serverTime: number;
    queueItemId: string | null;
  }) => void;
  'room:closed': (p: { roomId: string }) => void;
  error: (e: ApiError) => void;
}

/**
 * Cliente -> servidor.
 * 'clock:sync' devuelve la hora del servidor para estimar el desfase del reloj del cliente
 * (base de la sincronización de reproducción y letras).
 */
export interface ClientToServerEvents {
  'clock:sync': (ack: (r: { serverTime: number }) => void) => void;
  /** Suscribe el socket a la sala. Admins: deben ser miembros de la organización. Invitados: solo su sala. */
  'room:join': (
    p: { roomId: string },
    ack: (r: { ok: true } | { ok: false; message: string }) => void,
  ) => void;
}
