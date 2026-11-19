import { ApiClientError, createApiClient } from '@ks/api-client';
import { useAuth } from '@/stores/auth';

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const api = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => useAuth.getState().accessToken,
});

/** Mensaje legible para mostrar al usuario a partir de cualquier error de la API. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.payload.message;
  if (err instanceof TypeError) return 'No se pudo conectar con el servidor';
  return 'Error inesperado';
}
