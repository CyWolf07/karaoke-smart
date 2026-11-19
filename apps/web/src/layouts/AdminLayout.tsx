import { useMutation } from '@tanstack/react-query';
import { Building2, LayoutDashboard, LogOut, Mic, Tv } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getStoredRefreshToken, useAuth } from '@/stores/auth';

/** Solo se listan secciones que ya funcionan; las de fases futuras no se muestran. */
const NAV = [
  { to: '/admin', end: true, label: 'Inicio', icon: LayoutDashboard },
  { to: '/admin/organizacion', end: false, label: 'Organización', icon: Building2 },
] as const;

const sideLink = (active: boolean) =>
  cn(
    'flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-colors',
    active ? 'bg-surface-raised text-foreground' : 'text-muted hover:text-foreground',
  );

const bottomLink = (active: boolean) =>
  cn(
    'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-xs',
    active ? 'text-primary' : 'text-muted',
  );

export function AdminLayout() {
  const { user, organizations, clear } = useAuth();
  const logout = useMutation({
    mutationFn: async () => {
      const rt = getStoredRefreshToken();
      if (rt) await api.auth.logout(rt).catch(() => undefined);
    },
    onSettled: clear,
  });

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-r border-border bg-surface p-4 md:flex md:flex-col">
        <div className="mb-8 flex items-center gap-2 px-2 font-bold">
          <Mic className="text-primary" size={22} /> Karaoke Smart
        </div>
        <nav className="space-y-1">
          {NAV.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => sideLink(isActive)}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <a href="/screen" target="_blank" rel="noreferrer" className={sideLink(false)}>
            <Tv size={18} /> Abrir pantalla principal
          </a>
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <p className="truncate px-2 text-sm">{user?.displayName}</p>
          <p className="mb-3 truncate px-2 text-xs text-muted">{organizations[0]?.name}</p>
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={sideLink(false)}
          >
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-border px-4 py-2 md:hidden">
        <span className="flex items-center gap-2 font-bold">
          <Mic className="text-primary" size={20} /> Karaoke Smart
        </span>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Cerrar sesión"
          className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-raised"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="px-4 pb-24 pt-6 sm:px-8 md:pb-10 md:pt-10">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface md:hidden">
        {NAV.map(({ to, end, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => bottomLink(isActive)}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
        <a href="/screen" target="_blank" rel="noreferrer" className={bottomLink(false)}>
          <Tv size={20} /> Pantalla
        </a>
      </nav>
    </div>
  );
}
