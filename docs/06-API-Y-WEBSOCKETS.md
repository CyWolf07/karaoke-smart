# 06 · API y WebSockets

## REST

Versionado por URI (`/v1/...`). La documentación interactiva está en `/docs` (Swagger) y el JSON en `/docs-json`.

Todos los errores tienen este formato:

```json
{ "statusCode": 400, "error": "BAD_REQUEST", "message": "Datos inválidos", "details": [...], "requestId": "..." }
```

## Salas e invitados (Fase 2)

| Método y ruta                         | Quién                         | Qué hace                                               |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `POST /v1/organizations/:orgId/rooms` | owner, admin, host            | Crea la sala y su código de 6 caracteres (válido 24 h) |
| `GET /v1/organizations/:orgId/rooms`  | miembros                      | Salas abiertas con código y número de participantes    |
| `GET /v1/rooms/:roomId`               | miembros                      | Detalle de la sala                                     |
| `POST /v1/rooms/:roomId/code`         | owner, admin, host            | Código nuevo; el anterior (y su QR) deja de funcionar  |
| `POST /v1/rooms/:roomId/close`        | owner, admin, host            | Cierra la sala y desconecta a todos (`room:closed`)    |
| `POST /v1/rooms/join`                 | público (10/min por IP)       | `{code, nickname}` → token de invitado, sin cuenta     |
| `POST /v1/rooms/leave`                | invitado (Bearer de invitado) | Sale de la sala                                        |

- El código se guarda **hasheado** (SHA-256) en `rooms.join_code_hash` para buscarlo, y en claro solo en Redis con TTL para que la pantalla pueda volver a mostrarlo.
- El QR codifica `https://<dominio>/join?code=XXXXXX`.
- El **token de invitado** es un JWT `typ: guest` con `roomId` y caduca junto con el código. No sirve en rutas de administración (401).
- Límite de participantes: `rooms.max_participants` (50 por defecto).

## Socket.IO

- **Namespace** `/realtime`. Solo transporte WebSocket.
- **Autenticación:** el access token (o el token de invitado) va en `auth.token` del handshake. Si es inválido, se desconecta.
- **Escalado:** `@socket.io/redis-adapter`, de modo que varias instancias comparten salas y emisiones.
- **Tipos:** `ServerToClientEvents` y `ClientToServerEvents` en `@ks/shared-types`.

| Evento                                        | Dirección | Fase  |
| --------------------------------------------- | --------- | ----- |
| `clock:sync` (ack → `serverTime`)             | C→S       | 0 ✅  |
| `room:join` (`{roomId}`, ack `{ok}`)          | C→S       | 2 ✅  |
| `presence:update` (participantes + en línea)  | S→C       | 2 ✅  |
| `room:closed`                                 | S→C       | 2 ✅  |
| `queue:update` (con `version`)                | S→C       | 2 / 6 |
| `playback:state` (`positionMs`, `serverTime`) | S→C       | 3     |

## Sincronización de reproducción y letras

El servidor emite `{state, positionMs, serverTime}`. Cada cliente mide su desfase con `clock:sync` y estima la posición con `estimatePosition()` (`@ks/business-logic`). Las letras usan esa posición, no temporizadores independientes.

## Concurrencia de la cola

Cada mutación incluye la `version` esperada. El servidor aplica la mutación con un `UPDATE ... WHERE version = ?` y un lock de Redis al reordenar. Si hay conflicto, responde 409 y el cliente recarga la cola.
