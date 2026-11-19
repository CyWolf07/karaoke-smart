import { useQuery } from '@tanstack/react-query';
import { Check, Mic, QrCode } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { StatusDot } from '@/components/StatusDot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { loadNickname, saveNickname, validateNickname } from '@/lib/nickname';

/**
 * App del participante (celular, sin cuenta). En la Fase 1 guarda el apodo en el
 * dispositivo y muestra si el servidor responde. Entrar a una sala requiere el QR (Fase 2).
 */
export function JoinPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: api.health, refetchInterval: 15_000 });
  const [nickname, setNickname] = useState(loadNickname);
  const [saved, setSaved] = useState(Boolean(loadNickname()));
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = validateNickname(nickname);
    if (!r.ok) return setError(r.error);
    saveNickname(r.value);
    setNickname(r.value);
    setError(null);
    setSaved(true);
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
      <header className="mb-10 flex items-center justify-between">
        <span className="flex items-center gap-2 font-bold">
          <Mic className="text-primary" size={20} /> Karaoke Smart
        </span>
        <StatusDot
          up={health.isError ? false : health.data ? health.data.status === 'ok' : null}
          label={
            health.isError ? 'Sin servidor' : health.data ? 'Servidor en línea' : 'Comprobando'
          }
        />
      </header>

      <h1 className="mb-2 text-3xl font-bold">¿Cómo te llamamos?</h1>
      <p className="mb-6 text-muted">Tu apodo aparecerá en la cola cuando pidas canciones.</p>

      <form onSubmit={submit} className="space-y-3">
        <Input
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setSaved(false);
          }}
          placeholder="Tu apodo"
          autoComplete="nickname"
          enterKeyHint="done"
          maxLength={30}
          aria-invalid={Boolean(error)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={saved}>
          {saved ? (
            <>
              <Check size={18} /> Guardado en este dispositivo
            </>
          ) : (
            'Guardar apodo'
          )}
        </Button>
      </form>

      <div className="mt-10 flex items-start gap-4 rounded-lg bg-surface-raised p-5">
        <QrCode className="mt-1 shrink-0 text-primary" />
        <p className="text-sm text-muted">
          Para entrar a una sala escanea el QR de la pantalla principal. Las salas y el QR se
          habilitan en la Fase 2.
        </p>
      </div>

      <p className="mt-auto pt-10 text-center text-sm text-muted">
        ¿Eres el anfitrión?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
