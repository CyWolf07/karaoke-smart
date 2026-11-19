import { useQuery } from '@tanstack/react-query';
import { Maximize, Mic, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { StatusDot } from '@/components/StatusDot';
import { useRealtimeStatus, type RtStatus } from '@/hooks/useRealtimeStatus';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { api, errorMessage } from '@/lib/api';
import { joinUrl } from '@/lib/guest';
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

function ScreenShell({ status, children }: { status: RtStatus; children: ReactNode }) {
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const on = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background p-6 sm:p-10">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-3 text-xl font-bold sm:text-2xl">
          <Mic className="text-primary" /> Karaoke Smart
        </span>
        <div className="flex items-center gap-4">
          <StatusDot
            up={status === 'conectando' ? null : status === 'conectado'}
            label={
              status === 'conectado'
                ? 'En línea'
                : status === 'conectando'
                  ? 'Conectando'
                  : 'Sin conexión'
            }
          />
          {!fs && document.fullscreenEnabled && (
            <button
              onClick={() => document.documentElement.requestFullscreen().catch(() => undefined)}
              aria-label="Pantalla completa"
              className="pressable grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-surface-raised"
            >
              <Maximize size={20} />
            </button>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

/** Pantalla de una sala: QR y código para entrar, y participantes en vivo. */
function RoomScreen({ roomId }: { roomId: string }) {
  const room = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.rooms.get(roomId),
    refetchInterval: 30_000,
  });
  const presence = useRoomPresence(roomId, () => useAuth.getState().accessToken);
  const online = presence.participants.filter((p) => p.online);
  const code = room.data?.joinCode;
  const closed = presence.closed || room.data?.status === 'closed';

  return (
    <ScreenShell status={presence.status}>
      {room.isError || presence.error ? (
        <main className="grid flex-1 place-items-center text-center text-danger">
          {room.isError ? errorMessage(room.error) : presence.error}
        </main>
      ) : closed ? (
        <main className="grid flex-1 place-items-center text-center">
          <div>
            <p className="text-3xl font-bold">La sala se cerró</p>
            <Link to="/admin/salas" className="mt-4 inline-block text-primary">
              Volver a las salas
            </Link>
          </div>
        </main>
      ) : (
        <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[auto_1fr]">
          <section className="flex flex-col items-center gap-6 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl">{room.data?.name ?? '…'}</h1>
            <div className="rounded-lg bg-white p-5">
              {code ? (
                <QRCodeSVG
                  value={joinUrl(window.location.origin, code)}
                  size={280}
                  level="M"
                  aria-label="Código QR para unirse a la sala"
                />
              ) : (
                <div className="grid h-[280px] w-[280px] place-items-center text-neutral-500">
                  <QrCode size={56} />
                </div>
              )}
            </div>
            <div>
              <p className="text-muted">Escanea el QR o entra en</p>
              <p className="text-xl font-semibold">{window.location.host}/join</p>
              <p className="mt-3 font-mono text-5xl font-bold tracking-[0.3em] text-primary sm:text-6xl">
                {code ?? '······'}
              </p>
              {!code && room.data && (
                <p className="mt-2 text-sm text-warning">
                  El código caducó: genera uno nuevo desde el panel.
                </p>
              )}
            </div>
          </section>

          <section className="self-stretch rounded-lg bg-surface p-6">
            <h2 className="mb-4 text-xl font-semibold">
              En la sala{' '}
              <span className="text-muted">
                ({online.length} en línea de {presence.participants.length})
              </span>
            </h2>
            {presence.participants.length === 0 ? (
              <p className="text-muted">Esperando a que entre el primer invitado…</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {presence.participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-full bg-surface-raised px-4 py-2 text-lg"
                  >
                    <span
                      className={
                        p.online
                          ? 'h-2 w-2 rounded-full bg-primary'
                          : 'h-2 w-2 rounded-full bg-muted'
                      }
                    />
                    <span className={p.online ? '' : 'text-muted'}>{p.nickname}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>
      )}
    </ScreenShell>
  );
}

/** Sin sala elegida: reloj y acceso a las salas abiertas (si hay una sola, se abre directamente). */
function LobbyScreen() {
  const org = useAuth((s) => s.organizations[0]);
  const rt = useRealtimeStatus();
  const clock = useServerClock(rt.offsetMs);
  const rooms = useQuery({
    queryKey: ['rooms', org?.id],
    queryFn: () => api.rooms.list(org!.id),
    enabled: Boolean(org),
  });
  if (rooms.data?.length === 1) return <Navigate to={`/screen/${rooms.data[0].id}`} replace />;

  return (
    <ScreenShell status={rt.status}>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <p className="text-lg text-muted sm:text-2xl">{org?.name}</p>
        <p className="font-mono text-6xl font-bold tabular-nums sm:text-8xl lg:text-9xl">
          {clock.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {rooms.data && rooms.data.length > 1 ? (
          <div className="flex flex-wrap justify-center gap-3">
            {rooms.data.map((r) => (
              <Link
                key={r.id}
                to={`/screen/${r.id}`}
                className="pressable rounded-full bg-surface-raised px-6 py-3 font-semibold hover:bg-border"
              >
                {r.name}
              </Link>
            ))}
          </div>
        ) : (
          rooms.data && (
            <div className="flex max-w-md flex-col items-center gap-3 rounded-lg border border-dashed border-border p-8">
              <QrCode size={56} className="text-muted" />
              <p className="text-lg font-semibold">No hay una sala abierta</p>
              <Link to="/admin/salas" className="text-primary">
                Crear una sala en el panel
              </Link>
            </div>
          )
        )}
      </main>
    </ScreenShell>
  );
}

export function ScreenPage() {
  const { roomId } = useParams();
  return roomId ? <RoomScreen roomId={roomId} /> : <LobbyScreen />;
}
