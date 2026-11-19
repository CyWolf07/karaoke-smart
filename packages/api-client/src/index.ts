import type {
  ApiError,
  AuthResponse,
  GuestSession,
  HealthResponse,
  OrganizationDto,
  QueueDto,
  RoomDto,
  SearchResultDto,
  UserDto,
} from '@ks/shared-types';

export class ApiClientError extends Error {
  constructor(public readonly payload: ApiError) {
    super(payload.message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Cliente REST tipado para la API v1. */
export function createApiClient(opts: ApiClientOptions) {
  const doFetch = opts.fetchImpl ?? fetch;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    tokenOverride?: string,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = tokenOverride ?? opts.getAccessToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await doFetch(`${opts.baseUrl}/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = res.status === 204 ? undefined : await res.json().catch(() => undefined);
    if (!res.ok) {
      throw new ApiClientError(
        (data as ApiError | undefined) ?? {
          statusCode: res.status,
          error: res.statusText,
          message: res.statusText,
        },
      );
    }
    return data as T;
  }

  return {
    health: () => request<HealthResponse>('GET', '/health'),
    auth: {
      register: (b: {
        email: string;
        password: string;
        displayName: string;
        organizationName: string;
      }) => request<AuthResponse>('POST', '/auth/register', b),
      login: (b: { email: string; password: string }) =>
        request<AuthResponse>('POST', '/auth/login', b),
      refresh: (refreshToken: string) =>
        request<AuthResponse>('POST', '/auth/refresh', { refreshToken }),
      logout: (refreshToken: string) => request<void>('POST', '/auth/logout', { refreshToken }),
      me: () => request<UserDto>('GET', '/auth/me'),
    },
    organizations: {
      list: () => request<OrganizationDto[]>('GET', '/organizations'),
    },
    rooms: {
      list: (orgId: string) => request<RoomDto[]>('GET', `/organizations/${orgId}/rooms`),
      create: (orgId: string, name: string) =>
        request<RoomDto>('POST', `/organizations/${orgId}/rooms`, { name }),
      get: (roomId: string) => request<RoomDto>('GET', `/rooms/${roomId}`),
      regenerateCode: (roomId: string) => request<RoomDto>('POST', `/rooms/${roomId}/code`),
      close: (roomId: string) => request<RoomDto>('POST', `/rooms/${roomId}/close`),
      /** Público: entrar como invitado con el código de la sala. */
      join: (code: string, nickname: string) =>
        request<GuestSession>('POST', '/rooms/join', { code, nickname }),
      leave: (guestToken: string) => request<void>('POST', '/rooms/leave', undefined, guestToken),
    },
    /** Cola y búsqueda: `token` permite usar el token de invitado en lugar del de sesión. */
    queue: {
      get: (roomId: string, token?: string) =>
        request<QueueDto>('GET', `/rooms/${roomId}/queue`, undefined, token),
      add: (roomId: string, videoId: string, token?: string) =>
        request<QueueDto>('POST', `/rooms/${roomId}/queue`, { videoId }, token),
      remove: (roomId: string, itemId: string, token?: string) =>
        request<QueueDto>('DELETE', `/rooms/${roomId}/queue/${itemId}`, undefined, token),
      advance: (roomId: string, fromItemId?: string | null) =>
        request<QueueDto>('POST', `/rooms/${roomId}/queue/advance`, { fromItemId }),
      search: (roomId: string, q: string, token?: string) =>
        request<SearchResultDto[]>(
          'GET',
          `/rooms/${roomId}/search?q=${encodeURIComponent(q)}`,
          undefined,
          token,
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
