import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { api } from '@/lib/api';
import { DashboardPage } from '@/pages/Dashboard';
import { AuthPage } from '@/pages/Auth';
import { HomePage } from '@/pages/Home';
import { JoinPage } from '@/pages/Join';
import { OrganizationPage } from '@/pages/Organization';
import { RoomsPage } from '@/pages/Rooms';
import { ScreenPage } from '@/pages/Screen';
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
  const location = useLocation();
  if (restoring)
    return <div className="grid min-h-dvh place-items-center text-muted">Cargando…</div>;
  return accessToken ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
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
            <ScreenPage />
          </RequireAuth>
        }
      />
      <Route path="/inicio" element={<HomePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route
        path="/screen/:roomId"
        element={
          <RequireAuth>
            <ScreenPage />
          </RequireAuth>
        }
      />
      <Route
        path="/screen"
        element={
          <RequireAuth>
            <ScreenPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="salas" element={<RoomsPage />} />
        <Route path="organizacion" element={<OrganizationPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
