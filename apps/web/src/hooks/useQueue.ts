import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';

/** Cola de la sala por REST; se vuelve a pedir cada vez que llega `queue:update`. */
export function useQueue(roomId: string, queueTick: number, token?: string) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['queue', roomId],
    queryFn: () => api.queue.get(roomId, token),
  });
  useEffect(() => {
    if (queueTick > 0) void qc.invalidateQueries({ queryKey: ['queue', roomId] });
  }, [queueTick, roomId, qc]);
  return query;
}
