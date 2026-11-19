import type { GuestSession } from '@ks/shared-types';
import { joinCodeSchema } from '@ks/validation';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Mic } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRoomPresence } from '@/hooks/useRoomPresence';
import { api, errorMessage } from '@/lib/api';
import { clearGuest, loadGuest, saveGuest } from '@/lib/guest';
import { loadNickname, saveNickname, validateNickname } from '@/lib/nickname';

function Header() {
  return (
    <header className="mb-10 flex items-center gap-2 font-bold">
      <Mic className="text-primary" size={20} /> Karaoke Smart
    </header>
  );
}

/** Dentro de la sala: estado de conexión y quién más está (en vivo). */
function GuestRoom({ session, onLeave }: { session: GuestSession; onLeave: () => void }) {
  const presence = useRoomPresence(session.room.id, () => session.guestToken);
  const leave = useMutation({
    mutationFn: () => api.rooms.leave(session.guestToken).catch(() => undefined),
    onSettled: onLeave,
  });

  if (presence.closed || presence.error)
    return (
      <div className="text-center">
        <p className="mb-2 text-2xl font-bold">
          {presence.closed ? 'La sala se cerró' : 'Ya no estás en esta sala'}
        </p>
        <p className="mb-6 text-muted">
          {presence.closed ? 'Gracias por cantar.' : presence.error}
        </p>
        <Button size="lg" className="w-full" onClick={onLeave}>
          Entrar a otra sala
        </Button>
      </div>
    );

  return (
    <>
      <p className="text-sm text-muted">Estás en</p>
      <h1 className="mb-1 text-3xl font-bold">{session.room.name}</h1>
      <p className="mb-8 text-muted">
        como <span className="font-semibold text-foreground">{session.participant.nickname}</span>
      </p>

      <section className="mb-8 rounded-lg bg-surface-raised p-5">
        <h2 className="mb-3 font-semibold">En la sala</h2>
        <ul className="space-y-2">
          {presence.participants.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span className={p.online ? '' : 'text-muted'}>
                {p.nickname}
                {p.id === session.participant.id && ' (tú)'}
              </span>
              <StatusDot up={p.online} label={p.online ? 'En línea' : 'Desconectado'} />
            </li>
          ))}
        </ul>
      </section>

      <p className="mb-6 text-sm text-muted">
        Pedir canciones llega en la siguiente fase, junto con YouTube y Spotify.
      </p>
      <Button
        variant="secondary"
        size="lg"
        className="mt-auto w-full"
        onClick={() => leave.mutate()}
        disabled={leave.isPending}
      >
        <LogOut size={18} /> Salir de la sala
      </Button>
    </>
  );
}

/** Entrar con el código (escrito o leído del QR, que llega en ?code=). */
function JoinForm({ onJoined }: { onJoined: (s: GuestSession) => void }) {
  const [params] = useSearchParams();
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase());
  const [nickname, setNickname] = useState(loadNickname);
  const [error, setError] = useState<string | null>(null);
  const join = useMutation({
    mutationFn: (v: { code: string; nickname: string }) => api.rooms.join(v.code, v.nickname),
    onSuccess: (s) => {
      saveNickname(s.participant.nickname);
      saveGuest(s);
      onJoined(s);
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const c = joinCodeSchema.safeParse(code);
    if (!c.success) return setError('El código tiene 6 letras o números');
    const n = validateNickname(nickname);
    if (!n.ok) return setError(n.error);
    setError(null);
    join.mutate({ code: c.data, nickname: n.value });
  }

  return (
    <>
      <h1 className="mb-2 text-3xl font-bold">Entra a la sala</h1>
      <p className="mb-6 text-muted">Escanea el QR de la pantalla o escribe su código.</p>
      <form onSubmit={submit} className="space-y-3">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
          placeholder="Código (6 caracteres)"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          className="text-center font-mono text-2xl tracking-[0.3em]"
          aria-label="Código de la sala"
        />
        <Input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Tu apodo"
          maxLength={30}
          autoComplete="nickname"
          enterKeyHint="go"
          aria-label="Tu apodo"
        />
        {(error || join.isError) && (
          <p className="text-sm text-danger">{error ?? errorMessage(join.error)}</p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={join.isPending}>
          {join.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-auto pt-10 text-center text-sm text-muted">
        ¿Eres el anfitrión?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}

/** App del participante (celular, sin cuenta). */
export function JoinPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  // Un QR nuevo (?code=) tiene prioridad sobre una sesión guardada de otra sala.
  const [session, setSession] = useState<GuestSession | null>(() =>
    params.get('code') ? null : loadGuest(),
  );

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <Header />
      {session ? (
        <GuestRoom
          session={session}
          onLeave={() => {
            clearGuest();
            setSession(null);
          }}
        />
      ) : (
        <JoinForm
          onJoined={(s) => {
            setSession(s);
            navigate('/join', { replace: true });
          }}
        />
      )}
    </div>
  );
}
