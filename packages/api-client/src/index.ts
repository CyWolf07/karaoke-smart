import type {
  ApiError,
  AuthResponse,
  HealthResponse,
  OrganizationDto,
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

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = opts.getAccessToken?.();
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
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
