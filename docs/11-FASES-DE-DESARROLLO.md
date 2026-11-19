# 11 · Fases de desarrollo

Una fase se cierra solo cuando sus pruebas de aceptación pasan **con resultados reales documentados** (no basta con que la interfaz se vea bien).

| Fase | Contenido                                                                                   | Estado |
| ---- | ------------------------------------------------------------------------------------------- | ------ |
| 0    | Monorepo, Docker, Prisma (16 tablas), auth, Swagger, logs, salud, Socket.IO autenticado, CI | ✅     |
| 1    | Diseño y navegación: pantalla principal, panel admin, app participante (responsive)         | ⏳     |
| 2    | Salas, QR con expiración, invitados, presencia, reconexión, modos local y remoto            | ⏳     |
| 3    | Reproductor central, `MusicProvider`, YouTube, Spotify, local                               | ⏳     |
| 4    | Letras LRC, sincronización con el reloj del servidor, pantalla completa                     | ⏳     |
| 5    | Micrófonos (LiveKit), entradas externas, mezclador, presets                                 | ⏳     |
| 6    | Administración: cola colaborativa, permisos, bloqueo, límites                               | ⏳     |
| 7    | App Android: QR, audio, APK y AAB                                                           | ⏳     |
| 8    | Producción: seguridad, optimización, despliegue, monitoreo                                  | ⏳     |

## Pruebas de aceptación globales

1. Un televisor abre una sala y genera un QR.
2. Dos celulares se conectan a la misma sala.
3. Los celulares pueden solicitar canciones.
4. La cola se actualiza simultáneamente en todos los dispositivos.
5. Un celular transmite su micrófono al sistema principal.
6. Dos micrófonos funcionan a la vez.
7. El administrador puede cambiar la entrada de audio.
8. La reproducción y las letras permanecen sincronizadas.
9. El sistema funciona en una misma red Wi-Fi.
10. El sistema funciona con dispositivos en redes diferentes.
11. Se recupera una sesión después de una desconexión.
12. La aplicación funciona en navegador y en Android.
13. Los permisos y las restricciones de los proveedores se gestionan correctamente.

## Resultados — Fase 0

Ver [TESTING-REQUIREMENTS](../AI/TESTING-REQUIREMENTS.md#registro-de-resultados).
