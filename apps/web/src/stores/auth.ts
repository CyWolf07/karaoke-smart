import type { AuthResponse, OrganizationDto, UserDto } from '@ks/shared-types';
import { create } from 'zustand';

const REFRESH_KEY = 'ks.refresh';

interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
  organizations: OrganizationDto[];
  /** true mientras se intenta restaurar la sesión al cargar la app. */
  restoring: boolean;
  setSession: (r: AuthResponse) => void;
  clear: () => void;
  setRestoring: (v: boolean) => void;
}

/**
 * Access token solo en memoria. El refresh token se guarda en localStorage para
 * sobrevivir recargas (limitación documentada en docs/09: migrar a cookie httpOnly
 * cuando web y API compartan dominio en producción).
 */
export const useAuth = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  organizations: [],
  restoring: true,
  setSession: (r) => {
    localStorage.setItem(REFRESH_KEY, r.refreshToken);
    set({ accessToken: r.accessToken, user: r.user, organizations: r.organizations });
  },
  clear: () => {
    localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, user: null, organizations: [] });
  },
  setRestoring: (restoring) => set({ restoring }),
}));

export const getStoredRefreshToken = (): string | null => localStorage.getItem(REFRESH_KEY);
