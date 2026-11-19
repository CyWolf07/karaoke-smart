import type { GuestSession } from '@ks/shared-types';

const KEY = 'ks.guest';

/** Sesión de invitado en este dispositivo (permite volver a la sala tras recargar). */
export function loadGuest(): GuestSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GuestSession) : null;
  } catch {
    return null;
  }
}

export function saveGuest(s: GuestSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Almacenamiento bloqueado: la sesión vive solo en esta pestaña.
  }
}

export function clearGuest(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nada que limpiar.
  }
}

/** URL que codifica el QR: abre /join con el código ya escrito. */
export const joinUrl = (origin: string, code: string) =>
  `${origin}/join?code=${encodeURIComponent(code)}`;
