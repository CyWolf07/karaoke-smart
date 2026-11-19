import { Maximize, Mic, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatusDot } from '@/components/StatusDot';
import { useRealtimeStatus } from '@/hooks/useRealtimeStatus';
import { useAuth } from '@/stores/auth';

/** Reloj corregido con el desfase medido contra el servidor (clock:sync). */
function useServerClock(offsetMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return new Date(now + (offsetMs ?? 0));
}

/**
 * Pantalla principal (TV). En la Fase 1 muestra la marca, el reloj sincronizado y el
 * estado de conexión. El QR de la sala ocupa su lugar cuando existan salas (Fase 2).
 */
export function ScreenPage() {
  const { organizations } = useAuth();
  const rt = useRealtimeStatus();
  const clock = useServerClock(rt.offsetMs);
  const [fs, setFs] = useState(false);

  useEffect(() => {
    const on = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background p-6 sm:p-12">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
          <Mic className="text-primary" /> Karaoke Smart
        </span>
        <div className="flex items-center gap-4">
          <StatusDot
            up={rt.status === 'conectando' ? null : rt.status === 'conectado'}
            label={
              rt.status === 'conectado'
                ? 'En línea'
                : rt.status === 'conectando'
                  ? 'Conectando'
                  : 'Sin conexión'
            }
          />
          {!fs && document.fullscreenEnabled && (
            <button
              onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
              aria-label="Pantalla completa"
              className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-raised"
            >
              <Maximize size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <p className="text-lg text-muted sm:text-2xl">{organizations[0]?.name}</p>
        <p className="font-mono text-6xl font-bold tabular-nums sm:text-8xl lg:text-9xl">
          {clock.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8">
          <QrCode size={56} className="text-muted" />
          <p className="text-lg font-semibold">No hay una sala abierta</p>
          <p className="text-sm text-muted">
            Aquí aparecerá el código QR para unirse cuando se abra una sala (Fase 2).
          </p>
        </div>
      </main>
    </div>
  );
}
