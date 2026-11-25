import { Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { API_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

/** Enlace estable: la API redirige al último APK publicado (ANDROID_APK_URL). */
export const ANDROID_DOWNLOAD_URL = `${API_URL}/v1/app/android`;

/** Dentro de la app Android (WebView) no tiene sentido ofrecer descargarla. */
const insideApp =
  typeof navigator !== 'undefined' && navigator.userAgent.includes('KaraokeSmartApp');

/** Botón de descarga del APK. `withQr` añade un QR para descargarla desde otro celular. */
export function DownloadApp({ withQr, className }: { withQr?: boolean; className?: string }) {
  if (insideApp) return null;
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {withQr && (
        <div className="shrink-0 rounded-md bg-white p-2">
          <QRCodeSVG value={ANDROID_DOWNLOAD_URL} size={96} level="M" aria-hidden />
        </div>
      )}
      <div className="min-w-0">
        <a
          href={ANDROID_DOWNLOAD_URL}
          className="pressable inline-flex h-11 items-center gap-2 rounded-full bg-surface px-5 text-sm font-semibold ring-1 ring-border hover:bg-border"
        >
          <Download size={16} /> Descargar app Android
        </a>
        <p className="mt-2 text-xs text-muted">
          Archivo APK. Al abrirlo, Android pedirá permitir la instalación desde el navegador.
        </p>
      </div>
    </div>
  );
}
