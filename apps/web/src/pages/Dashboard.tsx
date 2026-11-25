import { useQuery } from '@tanstack/react-query';
import { DoorOpen, QrCode, Smartphone, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DownloadApp } from '@/components/DownloadApp';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/ui/button';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const STEPS = [
  { icon: DoorOpen, title: 'Crea una sala', text: 'Ponle nombre; se genera su código.' },
  { icon: Tv, title: 'Abre la pantalla', text: 'En el televisor: muestra el QR y la cola.' },
  { icon: QrCode, title: 'Que escaneen', text: 'Los invitados entran y piden canciones.' },
] as const;

export function DashboardPage() {
  const { user, organizations } = useAuth();
  const org = organizations[0];
  const rooms = useQuery({
    queryKey: ['rooms', org?.id],
    queryFn: () => api.rooms.list(org!.id),
    enabled: Boolean(org),
  });
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 30_000 });
  const rt = useRealtimeStatus();
  const serverUp = health.isError ? false : health.data ? health.data.status === 'ok' : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Hola, {user?.displayName}</h1>
          <p className="text-sm text-muted">{org?.name}</p>
        </div>
        <div className="flex gap-4">
          <StatusDot up={serverUp} label={serverUp === false ? 'Servidor caído' : 'Servidor'} />
          <StatusDot
            up={rt.status === 'conectando' ? null : rt.status === 'conectado'}
            label="Tiempo real"
          />
        </div>
      </header>

      <section className="rounded-lg border border-border bg-surface-raised p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Tus salas</h2>
          <Button asChild variant="secondary">
            <Link to="/admin/salas">Gestionar salas</Link>
          </Button>
        </div>
        {rooms.data && rooms.data.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rooms.data.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-xs text-muted">
                    Código <span className="font-mono text-primary">{r.joinCode ?? '—'}</span> ·{' '}
                    {r.participantCount} dentro
                  </p>
                </div>
                <Button asChild size="md" className="shrink-0">
                  <a href={`/screen/${r.id}`} target="_blank" rel="noreferrer">
                    <Tv size={16} /> Pantalla
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <ol className="mb-6 grid gap-4 sm:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-md bg-surface p-4">
                  <span className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                      {i + 1}
                    </span>
                    <Icon size={16} />
                  </span>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </li>
              ))}
            </ol>
            <Button asChild size="lg">
              <Link to="/admin/salas">Crear mi primera sala</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface-raised p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Smartphone size={18} className="text-primary" /> App para invitados
        </h2>
        <p className="mb-5 text-sm text-muted">
          No es obligatoria: desde cualquier celular basta con escanear el QR de la sala. La app
          Android añade el escáner integrado.
        </p>
        <DownloadApp withQr />
      </section>
    </div>
  );
}
