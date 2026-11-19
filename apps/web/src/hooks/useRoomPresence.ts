import type { PresenceParticipant } from '@ks/shared-types';
import { createRealtimeClient } from '@ks/realtime-client';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import type { RtStatus } from './useRealtimeStatus';

/**
 * Se suscribe a una sala por Socket.IO y mantiene la lista de participantes en vivo.
 * Vuelve a unirse a la sala en cada reconexión (recuperación tras cortes de red).
 */
export function useRoomPresence(roomId: string | undefined, getToken: () => string | null) {
  const [status, setStatus] = useState<RtStatus>('conectando');
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const socket = createRealtimeClient(API_URL, getToken);
    socket.on('connect', async () => {
      setStatus('conectado');
      try {
        const r = await socket.timeout(5000).emitWithAck('room:join', { roomId });
        setError(r.ok ? null : r.message);
      } catch {
        setError('El servidor no respondió');
      }
    });
    socket.on('presence:update', (p) => {
      if (p.roomId === roomId) setParticipants(p.participants);
    });
    socket.on('room:closed', (p) => {
      if (p.roomId === roomId) setClosed(true);
    });
    socket.on('error', (e) => setError(e.message));
    socket.on('disconnect', () => setStatus('desconectado'));
    socket.on('connect_error', (e) => {
      setStatus('desconectado');
      // Token rechazado (p. ej. sala cerrada o invitado expulsado): no tiene sentido reintentar.
      if (/token/i.test(e.message)) {
        setError('Ya no tienes acceso a esta sala');
        socket.close();
      }
    });
    socket.io.on('reconnect_attempt', () => setStatus('conectando'));
    socket.connect();
    return () => {
      socket.close();
    };
    // getToken se lee en cada (re)conexión, por eso no es dependencia del efecto.
  }, [roomId]);

  return { status, participants, closed, error };
}
