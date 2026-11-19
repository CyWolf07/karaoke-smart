import { parseYouTubeId } from '@ks/validation';
import { ApiClientError } from '@ks/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';

/**
 * Pedir canciones: pega un enlace de YouTube (siempre funciona) o escribe para buscar
 * (solo si el servidor tiene YOUTUBE_API_KEY; si no, se explica y se pide el enlace).
 */
export function SongPicker({ roomId, token }: { roomId: string; token?: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (videoId: string) => api.queue.add(roomId, videoId, token),
    onSuccess: (q) => {
      qc.setQueryData(['queue', roomId], q);
      setText('');
      search.reset();
      setNotice('¡Canción añadida a la cola!');
    },
  });
  const search = useMutation({
    mutationFn: (q: string) => api.queue.search(roomId, q, token),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    const id = parseYouTubeId(text);
    if (id) return add.mutate(id);
    if (text.trim().length >= 2) search.mutate(text.trim());
  }

  const searchUnavailable =
    search.error instanceof ApiClientError && search.error.payload.statusCode === 503;

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Busca una canción o pega el enlace de YouTube"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Buscar canción o enlace de YouTube"
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0"
          disabled={add.isPending || search.isPending || text.trim().length < 2}
          aria-label="Buscar o añadir"
        >
          {parseYouTubeId(text) ? <Plus size={18} /> : <Search size={18} />}
        </Button>
      </form>

      {notice && <p className="text-sm text-primary">{notice}</p>}
      {add.isError && <p className="text-sm text-danger">{errorMessage(add.error)}</p>}
      {search.isError && (
        <p className={searchUnavailable ? 'text-sm text-warning' : 'text-sm text-danger'}>
          {searchUnavailable
            ? 'La búsqueda aún no está activada. Abre YouTube, copia el enlace de la canción y pégalo aquí.'
            : errorMessage(search.error)}
        </p>
      )}
      {search.isPending && <p className="text-sm text-muted">Buscando…</p>}

      {search.data && (
        <ul className="space-y-2">
          {search.data.length === 0 && <li className="text-sm text-muted">Sin resultados.</li>}
          {search.data.map((r) => (
            <li key={r.externalId} className="flex items-center gap-3 rounded-md bg-surface p-2">
              {r.thumbnail && (
                <img
                  src={r.thumbnail}
                  alt=""
                  className="h-10 w-16 shrink-0 rounded-sm object-cover"
                  loading="lazy"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted">{r.channel}</p>
              </div>
              <Button
                size="md"
                variant="secondary"
                onClick={() => add.mutate(r.externalId)}
                disabled={add.isPending}
              >
                Pedir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
