# 07 · Sistema de audio y música

## Transporte: LiveKit (WebRTC)

- **Celular → LiveKit → pantalla o admin.** El participante recibe un token de LiveKit con permiso solo para publicar audio. La pantalla se suscribe a todas las pistas.
- **Modo local:** LiveKit corre en la LAN (Docker en el PC anfitrión), de modo que el audio no sale a internet.
- **Modo remoto:** LiveKit en la nube con TURN/TLS como respaldo. LiveKit elige la ruta (UDP directo, TCP o TURN) y el cliente muestra su estado.
- Socket.IO **no** transporta audio.

## Restricciones del navegador

- `getUserMedia` exige un contexto seguro (HTTPS). `http://192.168.x.x` **no** permite capturar micrófono.
- **Soluciones para el modo local:**
  1. Un certificado válido para un nombre que resuelva a la IP de la LAN (por ejemplo, un subdominio propio con DNS a la IP privada y un certificado DNS-01).
  2. mkcert en desarrollo (requiere instalar la CA en cada dispositivo).
  3. La app nativa Android (sin la restricción de contexto seguro).
  4. Pasar por LiveKit en la nube.
- El micrófono solo se solicita cuando el usuario pulsa **"USAR MI CELULAR COMO MICRÓFONO"**.

## Mezclador (Fase 5)

- Web Audio API en la pantalla o el admin. Cada fuente (pista remota o `enumerateDevices()` local) pasa por GainNode, AnalyserNode (medidor y saturación) y bus de voces. El bus de voces y la música van a un compresor y limitador, y de ahí a la salida.
- Presets (voz suave, normal, potente, fiesta) guardados en `settings`.
- **Anti-acople:** nunca se reproduce la voz en el dispositivo que la captura; se usan `echoCancellation`, `noiseSuppression` y `autoGainControl` cuando el dispositivo los soporta.

## Proveedores musicales

La interfaz `MusicProvider` tiene estos métodos, y las capacidades opcionales se declaran en `getPlaybackCapabilities()`:

- `searchTracks()`
- `getTrackDetails()`
- `getPlaybackCapabilities()`
- `playTrack()`
- `pauseTrack()`
- `getLyrics()`

| Proveedor | Búsqueda            | Reproducción                                      | Letras                                | Notas                                                                       |
| --------- | ------------------- | ------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| YouTube   | Data API v3 (cuota) | IFrame Player oficial en la pantalla              | no                                    | No se extrae audio. Las pistas instrumentales se identifican por metadatos. |
| Spotify   | Web API             | Web Playback SDK o Connect (requiere **Premium**) | **no** (la API pública no las ofrece) | OAuth por organización                                                      |
| Local     | catálogo propio     | `<audio>`                                         | LRC propio                            | Migración del catálogo de la app Electron                                   |

Cuando un proveedor no admite una función, la interfaz lo indica y ofrece una alternativa (subir un LRC, sincronizar a mano o usar otro proveedor).
