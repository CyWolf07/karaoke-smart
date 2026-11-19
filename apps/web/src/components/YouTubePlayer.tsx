import { useEffect, useRef } from 'react';

/** Tipos mínimos del YouTube IFrame Player API. */
interface YTPlayer {
  loadVideoById(id: string): void;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width: string;
      height: string;
      playerVars: Record<string, number | string>;
      events: {
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve, reject) => {
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!);
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('No se pudo cargar el reproductor de YouTube'));
    };
    document.head.appendChild(s);
  });
  return apiPromise;
}

const ENDED = 0;

/**
 * Reproductor oficial de YouTube incrustado. Llama a `onEnded` al terminar el vídeo y a
 * `onError` si YouTube no permite reproducirlo aquí (privado, bloqueado o no incrustable).
 */
export function YouTubePlayer({
  videoId,
  onEnded,
  onError,
}: {
  videoId: string;
  onEnded: () => void;
  onError: (message: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const latestId = useRef(videoId);
  latestId.current = videoId;
  const handlers = useRef({ onEnded, onError });
  handlers.current = { onEnded, onError };

  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !host.current) return;
        const el = document.createElement('div');
        host.current.replaceChildren(el);
        player.current = new YT.Player(el, {
          videoId: latestId.current,
          width: '100%',
          height: '100%',
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onStateChange: (e) => {
              if (e.data === ENDED) handlers.current.onEnded();
            },
            onError: (e) =>
              handlers.current.onError(
                e.data === 101 || e.data === 150
                  ? 'El dueño de este vídeo no permite reproducirlo fuera de YouTube'
                  : 'YouTube no pudo reproducir este vídeo',
              ),
          },
        });
      })
      .catch((e: Error) => handlers.current.onError(e.message));
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
    // El reproductor se crea una sola vez; los cambios de vídeo van por loadVideoById.
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    player.current?.loadVideoById(videoId);
  }, [videoId]);

  return <div ref={host} className="aspect-video w-full overflow-hidden rounded-lg bg-black" />;
}
