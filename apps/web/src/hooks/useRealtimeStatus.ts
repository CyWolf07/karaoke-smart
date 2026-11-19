import { createRealtimeClient } from '@ks/realtime-client';
import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/api';
import { useAuth } from '@/stores/auth';

export type RtStatus = 'conectando' | 'conectado' | 'desconectado';

/** Estado real de la conexión Socket.IO y desfase de reloj medido con el servidor. */
export function useRealtimeStatus() {
  const [status, setStatus] = useState<RtStatus>('conectando');
  const [offsetMs, setOffsetMs] = useState<number | null>(null);
  useEffect(() => {
    const socket = createRealtimeClient(API_URL, () => useAuth.getState().accessToken);
    socket.on('connect', async () => {
      setStatus('conectado');
      try {
        const t0 = Date.now();
        const { serverTime } = await socket.timeout(3000).emitWithAck('clock:sync');
        setOffsetMs(Math.round(serverTime - (t0 + Date.now()) / 2));
      } catch {
        setOffsetMs(null);
      }
    });
    socket.on('disconnect', () => setStatus('desconectado'));
    socket.on('connect_error', () => setStatus('desconectado'));
    socket.io.on('reconnect_attempt', () => setStatus('conectando'));
    socket.connect();
    return () => {
      socket.close();
    };
  }, []);
  return { status, offsetMs };
}
