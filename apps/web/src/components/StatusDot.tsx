import { cn } from '@/lib/utils';

/** Indicador de estado: null = comprobando, true = operativo, false = caído. */
export function StatusDot({ up, label }: { up: boolean | null; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-medium',
        up === null ? 'text-muted' : up ? 'text-primary' : 'text-danger',
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          up === null ? 'bg-muted' : up ? 'bg-primary' : 'bg-danger',
        )}
      />
      {label ?? (up === null ? 'Comprobando' : up ? 'Operativo' : 'Caído')}
    </span>
  );
}
