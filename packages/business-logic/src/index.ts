import type { PlaybackState } from '@ks/shared-types';

export interface LrcLine {
  timeMs: number;
  text: string;
}

const TAG = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** Parsea un archivo LRC a líneas ordenadas por tiempo. Ignora metadatos como [ar:] o [ti:]. */
export function parseLrc(source: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(TAG)];
    if (stamps.length === 0) continue;
    const text = raw.replace(TAG, '').trim();
    for (const m of stamps) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) : 0;
      lines.push({ timeMs: Number(m[1]) * 60000 + Number(m[2]) * 1000 + frac, text });
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

/** Índice de la línea activa para una posición (búsqueda binaria). -1 si aún no empieza. */
export function activeLineIndex(lines: LrcLine[], positionMs: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].timeMs <= positionMs) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

/** Posición estimada a partir del último estado autoritativo emitido por el servidor. */
export function estimatePosition(
  s: { state: PlaybackState; positionMs: number; serverTime: number },
  nowServerMs: number,
): number {
  if (s.state !== 'playing') return s.positionMs;
  return s.positionMs + Math.max(0, nowServerMs - s.serverTime);
}

/** Convierte un nombre en slug URL-seguro. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
