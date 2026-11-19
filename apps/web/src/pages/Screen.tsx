import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Maximize, Mic, Play, QrCode, SkipForward } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { QueueList } from '@/components/QueueList';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/ui/button';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { useQueue } from '@/hooks/useQueue';
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

function JoinPanel({ code, compact }: { code: string | null | undefined; compact?: boolean }) {
  const size = compact ? 150 : 280;
  return (
    <div
      className={
        compact ? 'flex items-center gap-4' : 'flex flex-col items-center gap-6 text-center'
      }
    >
      <div className="shrink-0 rounded-lg bg-white p-3">
        {code ? (
          <QRCodeSVG
            value={joinUrl(window.location.origin, code)}
            size={size}
            level="M"
            aria-label="Código QR para unirse a la sala"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="grid place-items-center text-neutral-500"
          >
            <QrCode size={48} />
          </div>
        )}
      </div>
      <div>
        <p className="text-muted">Escanea o entra en</p>
        <p className={compact ? 'font-semibold' : 'text-xl font-semibold'}>
          {window.location.host}/join
        </p>
        <p
          className={
            compact
              ? 'mt-1 font-mono text-3xl font-bold tracking-[0.25em] text-primary'
              : 'mt-3 font-mono text-5xl font-bold tracking-[0.3em] text-primary sm:text-6xl'
          }
        >
          {code ?? '······'}
        </p>
        {!code && (
          <p className="mt-2 text-sm text-warning">
            El código caducó: genera uno nuevo desde el panel.
          </p>
        )}
      </div>
    </div>
  );
}

/** Pantalla de una sala: QR, participantes, cola y reproductor de YouTube. */
function RoomScreen({ roomId }: { roomId: string }) {
  const room = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => api.rooms.get(roomId),
    refetchInterval: 30_000,
  });
  const presence = useRoomPresence(roomId, () => useAuth.getState().accessToken);
  const queue = useQueue(roomId, presence.queueTick);
  const qc = useQueryClient();
  // Los navegadores solo dejan sonar audio tras un gesto del usuario: un clic inicia el karaoke.
  const [started, setStarted] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const advance = useMutation({
    mutationFn: (fromItemId: string | null) => api.queue.advance(roomId, fromItemId),
    onSuccess: (q) => qc.setQueryData(['queue', roomId], q),
  });
  const remove = useMutation({
    mutationFn: (itemId: string) => api.queue.remove(roomId, itemId),
    onSuccess: (q) => qc.setQueryData(['queue', roomId], q),
  });

  const current = queue.data?.current ?? null;
  const hasNext = (queue.data?.upcoming.length ?? 0) > 0;
  const { mutate: advanceTo, isPending: advancing } = advance;
  // Sin canción sonando y con cola: arranca la siguiente automáticamente.
  useEffect(() => {
    if (started && queue.data && !current && hasNext && !advancing) advanceTo(null);
  }, [started, queue.data, current, hasNext, advancing, advanceTo]);

  const online = presence.participants.filter((p) => p.online);
  const code = room.data?.joinCode;
  const closed = presence.closed || room.data?.status === 'closed';

  if (room.isError || presence.error)
    return (
      <ScreenShell status={presence.status}>
        <main className="grid flex-1 place-items-center text-center text-danger">
          {room.isError ? errorMessage(room.error) : presence.error}
        </main>
      </ScreenShell>
    );

  if (closed)
    return (
      <ScreenShell status={presence.status}>
        <main className="grid flex-1 place-items-center text-center">
          <div>
            <p className="text-3xl font-bold">La sala se cerró</p>
            <Link to="/admin/salas" className="mt-4 inline-block text-primary">
              Volver a las salas
            </Link>
          </div>
        </main>
      </ScreenShell>
    );

  return (
    <ScreenShell status={presence.status}>
      <main className="grid flex-1 gap-8 py-6 lg:grid-cols-[1fr_380px]">
        <section className="flex min-w-0 flex-col gap-4">
          <h1 className="text-3xl font-bold">{room.data?.name ?? '…'}</h1>
          {!started ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-8 rounded-lg bg-surface p-8">
              <JoinPanel code={code} />
              <Button size="lg" onClick={() => setStarted(true)}>
                <Play size={20} /> Iniciar karaoke
              </Button>
            </div>
          ) : current ? (
            <>
              <YouTubePlayer
                videoId={current.track.externalId}
                onEnded={() => advance.mutate(current.id)}
                onError={(m) => {
                  setPlayerError(`${m}. Pasando a la siguiente…`);
                  window.setTimeout(() => {
                    setPlayerError(null);
                    advance.mutate(current.id);
                  }, 4000);
                }}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-semibold">{current.track.title}</p>
                  <p className="text-muted">
                    {current.requestedBy
                      ? `Canta ${current.requestedBy.nickname}`
                      : 'Pedida por el anfitrión'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => advance.mutate(current.id)}
                  disabled={advance.isPending}
                >
                  <SkipForward size={18} /> Siguiente
                </Button>
              </div>
              {playerError && <p className="text-warning">{playerError}</p>}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 rounded-lg bg-surface p-8 text-center">
              <JoinPanel code={code} />
              <p className="text-xl text-muted">Pide la primera canción desde tu celular.</p>
            </div>
          )}
          {advance.isError && <p className="text-danger">{errorMessage(advance.error)}</p>}
        </section>

        <aside className="flex flex-col gap-6 rounded-lg bg-surface p-5">
          {started && current && <JoinPanel code={code} compact />}
          <section>
            <h2 className="mb-3 text-lg font-semibold">
              En la sala{' '}
              <span className="text-muted">
                ({online.length} en línea de {presence.participants.length})
              </span>
            </h2>
            {presence.participants.length === 0 ? (
              <p className="text-muted">Esperando a que entre el primer invitado…</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {presence.participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-full bg-surface-raised px-3 py-1.5"
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
          <section>
            <QueueList
              queue={queue.data}
              canRemove={() => true}
              onRemove={(i) => remove.mutate(i.id)}
            />
            {remove.isError && (
              <p className="mt-2 text-sm text-danger">{errorMessage(remove.error)}</p>
            )}
          </section>
        </aside>
      </main>
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
