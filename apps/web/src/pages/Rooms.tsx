import type { RoomDto } from '@ks/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DoorClosed, RefreshCw, Tv, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

function RoomCard({ room, canManage }: { room: RoomDto; canManage: boolean }) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['rooms'] });
  const regen = useMutation({
    mutationFn: () => api.rooms.regenerateCode(room.id),
    onSuccess: refresh,
  });
  const close = useMutation({ mutationFn: () => api.rooms.close(room.id), onSuccess: refresh });
  const err = regen.error ?? close.error;

  return (
    <div className="rounded-lg border border-border bg-surface-raised p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{room.name}</h2>
          <p className="flex items-center gap-1 text-sm text-muted">
            <Users size={14} /> {room.participantCount} participante
            {room.participantCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Código</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-primary">
            {room.joinCode ?? '—'}
          </p>
        </div>
      </div>
      {room.joinCodeExpiresAt && (
        <p className="mb-4 text-xs text-muted">
          Válido hasta {new Date(room.joinCodeExpiresAt).toLocaleString('es')}
        </p>
      )}
      {err && <p className="mb-3 text-sm text-danger">{errorMessage(err)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="md">
          <a href={`/screen/${room.id}`} target="_blank" rel="noreferrer">
            <Tv size={16} /> Abrir pantalla con QR
          </a>
        </Button>
        {canManage && (
          <>
            <Button
              variant="secondary"
              onClick={() => regen.mutate()}
              disabled={regen.isPending}
              title="El código y el QR anteriores dejan de funcionar"
            >
              <RefreshCw size={16} /> Nuevo código
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm(`¿Cerrar "${room.name}"? Los participantes saldrán de la sala.`))
                  close.mutate();
              }}
              disabled={close.isPending}
            >
              <DoorClosed size={16} /> Cerrar sala
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function RoomsPage() {
  const org = useAuth((s) => s.organizations[0]);
  const canManage = org ? ['owner', 'admin', 'host'].includes(org.role) : false;
  const qc = useQueryClient();
  const rooms = useQuery({
    queryKey: ['rooms', org?.id],
    queryFn: () => api.rooms.list(org!.id),
    enabled: Boolean(org),
    refetchInterval: 15_000,
  });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => api.rooms.create(org!.id, name.trim()),
    onSuccess: () => {
      setName('');
      return qc.invalidateQueries({ queryKey: ['rooms'] });
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length >= 2) create.mutate();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-2xl font-bold">Salas</h1>
      <p className="mb-8 text-sm text-muted">
        Crea una sala y abre su pantalla: los invitados entran escaneando el QR o escribiendo el
        código en {window.location.host}/join.
      </p>

      {canManage && (
        <form onSubmit={submit} className="mb-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la sala (p. ej. Sala principal)"
            maxLength={60}
            enterKeyHint="done"
          />
          <Button type="submit" disabled={create.isPending || name.trim().length < 2}>
            Crear sala
          </Button>
        </form>
      )}
      {create.isError && <p className="mb-4 text-sm text-danger">{errorMessage(create.error)}</p>}
      {rooms.isError && <p className="mb-4 text-sm text-danger">{errorMessage(rooms.error)}</p>}

      {rooms.data?.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted">
          No hay salas abiertas.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {rooms.data?.map((r) => (
          <RoomCard key={r.id} room={r} canManage={canManage} />
        ))}
      </div>
    </div>
  );
}
