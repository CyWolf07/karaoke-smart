# 06 · API y WebSockets

## REST

Versionado por URI (`/v1/...`). La documentación interactiva está en `/docs` (Swagger) y el JSON en `/docs-json`.

Todos los errores tienen este formato:

```json
{ "statusCode": 400, "error": "BAD_REQUEST", "message": "Datos inválidos", "details": [...], "requestId": "..." }
```

## Socket.IO

- **Namespace** `/realtime`. Solo transporte WebSocket.
- **Autenticación:** el access token va en `auth.token` del handshake. Si es inválido, se desconecta.
- **Escalado:** `@socket.io/redis-adapter`, de modo que varias instancias comparten salas y emisiones.
- **Tipos:** `ServerToClientEvents` y `ClientToServerEvents` en `@ks/shared-types`.

| Evento                                        | Dirección | Fase  |
| --------------------------------------------- | --------- | ----- |
| `clock:sync` (ack → `serverTime`)             | C→S       | 0 ✅  |
| `presence:update`                             | S→C       | 2     |
| `queue:update` (con `version`)                | S→C       | 2 / 6 |
| `playback:state` (`positionMs`, `serverTime`) | S→C       | 3     |

## Sincronización de reproducción y letras

El servidor emite `{state, positionMs, serverTime}`. Cada cliente mide su desfase con `clock:sync` y estima la posición con `estimatePosition()` (`@ks/business-logic`). Las letras usan esa posición, no temporizadores independientes.

## Concurrencia de la cola

Cada mutación incluye la `version` esperada. El servidor aplica la mutación con un `UPDATE ... WHERE version = ?` y un lock de Redis al reordenar. Si hay conflicto, responde 409 y el cliente recarga la cola.
