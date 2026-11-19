import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from '@/lib/api';
import { DashboardPage } from '@/pages/Dashboard';
import { AuthPage } from '@/pages/Auth';
import { getStoredRefreshToken, useAuth } from '@/stores/auth';

/** Restaura la sesión con el refresh token y lo renueva antes de que caduque el access token. */
function useSessionRestore() {
  const { setSession, clear, setRestoring, accessToken } = useAuth();
  const timer = useRef<number>();

  useEffect(() => {
    const token = getStoredRefreshToken();
    if (!token) return setRestoring(false);
    api.auth
      .refresh(token)
      .then(setSession)
      .catch(clear)
      .finally(() => setRestoring(false));
  }, [setSession, clear, setRestoring]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!accessToken) return;
    const payload = accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = (JSON.parse(atob(payload)) as { exp: number }).exp * 1000;
    timer.current = window.setTimeout(
      () => {
        const rt = getStoredRefreshToken();
        if (rt) api.auth.refresh(rt).then(setSession).catch(clear);
      },
      Math.max(5_000, exp - Date.now() - 60_000),
    );
    return () => window.clearTimeout(timer.current);
  }, [accessToken, setSession, clear]);
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { accessToken, restoring } = useAuth();
  if (restoring)
    return <div className="grid min-h-screen place-items-center text-muted">Cargando…</div>;
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  useSessionRestore();
  return (
    <Routes>
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
