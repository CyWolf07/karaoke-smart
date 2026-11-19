# 03 · Arquitectura frontend

## Web (`apps/web`)

- **React 18, Vite y TypeScript estricto.**
- **Tailwind** con los colores de `@ks/design-tokens`. Componentes en `src/components/ui` con estilo shadcn/ui (`components.json` permite usar `npx shadcn add`).
- **Estado:** Zustand para la sesión y el estado local, TanStack Query para los datos del servidor.
- **Tiempo real:** `@ks/realtime-client` (Socket.IO tipado, con reconexión automática).
- **PWA:** `vite-plugin-pwa` (instalable cuando el navegador lo permite).

Rutas (Fase 1): `/` (elegir rol del dispositivo), `/join` (participante, sin cuenta: apodo guardado en el dispositivo), `/screen` (pantalla TV con reloj sincronizado y pantalla completa; requiere sesión), `/admin` y `/admin/organizacion` (panel con barra lateral en escritorio y navegación inferior en celular), `/login`, `/register`.
Previstas: `/screen/:roomId` y `/join/:token` con el QR (Fase 2). Las secciones de fases futuras no aparecen en la navegación.

### Sesión

El access token (15 min) se guarda solo en memoria y el refresh token en `localStorage`. Se renueva automáticamente 60 s antes de caducar. Ver la limitación en [09](09-SEGURIDAD-Y-ESCALABILIDAD.md).

## Móvil (`apps/mobile`)

- **Expo SDK 52 y Expo Router.** Los componentes nativos van separados de los web y solo se comparten tokens, tipos y cliente API.
- **Metro** está configurado para el monorepo (`metro.config.js`).
- **Builds:** `eas.json` con perfiles `development`, `preview` (APK) y `production` (AAB).
- **Fase 0:** pantalla que verifica la conexión real con la API.
