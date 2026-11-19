import { useMutation, useQuery } from '@tanstack/react-query';
import { createRealtimeClient } from '@ks/realtime-client';
import { LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, API_URL } from '@/lib/api';
import { getStoredRefreshToken, useAuth } from '@/stores/auth';
import { cn } from '@/lib/utils';

type RtStatus = 'conectando' | 'conectado' | 'desconectado';

/** Estado real de la conexión Socket.IO y desfase de reloj medido con el servidor. */
function useRealtimeStatus() {
  const [status, setStatus] = useState<RtStatus>('conectando');
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  useEffect(() => {
    const socket = createRealtimeClient(API_URL, () => useAuth.getState().accessToken);
    socket.on('connect', async () => {
      setStatus('conectado');
      const t0 = Date.now();
      const { serverTime } = await socket.timeout(3000).emitWithAck('clock:sync');
      setOffsetMs(Math.round(serverTime - (t0 + Date.now()) / 2));
    });
    socket.on('disconnect', () => setStatus('desconectado'));
    socket.io.on('reconnect_attempt', () => setStatus('conectando'));
    socket.connect();
    return () => {
      socket.close();
    };
  }, []);
  return { status, offsetMs };
}

function StatusPill({ label, up }: { label: string; up: boolean | null }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-surface px-4 py-3">
      <span className="text-sm">{label}</span>
      <span
        className={cn(
          'flex items-center gap-2 text-xs font-medium',
          up === null ? 'text-muted' : up ? 'text-primary' : 'text-danger',
        )}
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            up === null ? 'bg-muted' : up ? 'bg-primary' : 'bg-danger',
          )}
        />
        {up === null ? 'Comprobando' : up ? 'Operativo' : 'Caído'}
      </span>
    </div>
  );
}

export function DashboardPage() {
  const { user, organizations, clear } = useAuth();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 15_000 });
  const rt = useRealtimeStatus();
  const logout = useMutation({
    mutationFn: async () => {
      const rtk = getStoredRefreshToken();
      if (rtk) await api.auth.logout(rtk).catch(() => undefined);
    },
    onSettled: clear,
  });

  const org = organizations[0];
  const check = (k: string) =>
    health.isError ? false : health.data ? health.data.checks[k]?.status === 'up' : null;

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-8">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{org?.name}</p>
          <h1 className="text-2xl font-bold">Hola, {user?.displayName}</h1>
        </div>
        <Button variant="ghost" onClick={() => logout.mutate()} disabled={logout.isPending}>
          <LogOut size={18} /> Salir
        </Button>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-raised p-6">
          <h2 className="mb-4 font-semibold">Estado del sistema</h2>
          <div className="space-y-2">
            <StatusPill label="API" up={health.isError ? false : health.data ? true : null} />
            <StatusPill label="Base de datos" up={check('database')} />
            <StatusPill label="Redis" up={check('redis')} />
            <StatusPill
              label="Tiempo real"
              up={rt.status === 'conectando' ? null : rt.status === 'conectado'}
            />
          </div>
          {rt.offsetMs !== null && (
            <p className="mt-3 text-xs text-muted">
              Desfase de reloj con el servidor: {rt.offsetMs} ms
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-surface-raised p-6">
          <h2 className="mb-4 font-semibold">Tu organización</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Nombre</dt>
              <dd>{org?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Identificador</dt>
              <dd className="font-mono">{org?.slug}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Tu rol</dt>
              <dd className="capitalize">{org?.role}</dd>
            </div>
          </dl>
          <p className="mt-6 text-xs text-muted">
            Salas, QR, cola y reproductor se habilitan en las siguientes fases (ver docs/11).
          </p>
        </div>
      </section>
    </div>
  );
}
