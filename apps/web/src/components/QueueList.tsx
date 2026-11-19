import type { QueueDto, QueueItemDto } from '@ks/shared-types';
import { Music, X } from 'lucide-react';
import { cn } from '@/lib/utils';

function Row({
  item,
  playing,
  onRemove,
  large,
}: {
  item: QueueItemDto;
  playing?: boolean;
  onRemove?: () => void;
  large?: boolean;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-md p-2',
        playing ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-surface',
      )}
    >
      {item.track.coverUrl ? (
        <img
          src={item.track.coverUrl}
          alt=""
          className={cn('shrink-0 rounded-sm object-cover', large ? 'h-14 w-24' : 'h-10 w-16')}
          loading="lazy"
        />
      ) : (
        <span className="grid h-10 w-16 shrink-0 place-items-center rounded-sm bg-surface-raised">
          <Music size={16} className="text-muted" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('truncate font-medium', large && 'text-lg')}>{item.track.title}</p>
        <p className="truncate text-xs text-muted">
          {item.requestedBy ? `Pedida por ${item.requestedBy.nickname}` : 'Pedida por el anfitrión'}
        </p>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Quitar ${item.track.title}`}
          className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-raised hover:text-danger"
        >
          <X size={18} />
        </button>
      )}
    </li>
  );
}

/** Cola: lo que suena ahora y lo que viene. `canRemove` decide qué filas muestran el botón quitar. */
export function QueueList({
  queue,
  canRemove,
  onRemove,
  large,
}: {
  queue: QueueDto | undefined;
  canRemove?: (item: QueueItemDto) => boolean;
  onRemove?: (item: QueueItemDto) => void;
  large?: boolean;
}) {
  if (!queue) return <p className="text-muted">Cargando cola…</p>;
  const removable = (i: QueueItemDto) =>
    canRemove?.(i) && onRemove ? () => onRemove(i) : undefined;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Sonando</h3>
        {queue.current ? (
          <ul>
            <Row item={queue.current} playing large={large} onRemove={removable(queue.current)} />
          </ul>
        ) : (
          <p className="text-sm text-muted">Nada por ahora.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
          Siguientes ({queue.upcoming.length})
        </h3>
        {queue.upcoming.length === 0 ? (
          <p className="text-sm text-muted">La cola está vacía: ¡pide una canción!</p>
        ) : (
          <ul className="space-y-2">
            {queue.upcoming.map((i) => (
              <Row key={i.id} item={i} large={large} onRemove={removable(i)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
