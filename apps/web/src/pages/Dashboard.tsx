import { useQuery } from '@tanstack/react-query';
import { StatusDot } from '@/components/StatusDot';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

function Row({ label, up }: { label: string; up: boolean | null }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-surface px-4 py-3">
      <span className="text-sm">{label}</span>
      <StatusDot up={up} />
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 15_000 });
  const rt = useRealtimeStatus();
  const check = (k: string) =>
    health.isError ? false : health.data ? health.data.checks[k]?.status === 'up' : null;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">Hola, {user?.displayName}</h1>
      <p className="mb-8 text-sm text-muted">Estado en vivo de los servicios de Karaoke Smart.</p>
      <section className="max-w-xl rounded-lg border border-border bg-surface-raised p-6">
        <h2 className="mb-4 font-semibold">Estado del sistema</h2>
        <div className="space-y-2">
          <Row label="API" up={health.isError ? false : health.data ? true : null} />
          <Row label="Base de datos" up={check('database')} />
          <Row label="Redis" up={check('redis')} />
          <Row
            label="Tiempo real"
            up={rt.status === 'conectando' ? null : rt.status === 'conectado'}
          />
        </div>
        {rt.offsetMs !== null && (
          <p className="mt-3 text-xs text-muted">
            Desfase de reloj con el servidor: {rt.offsetMs} ms
          </p>
        )}
      </section>
    </div>
  );
}
