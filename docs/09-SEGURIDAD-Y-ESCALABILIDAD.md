# 09 · Seguridad y escalabilidad

## Implementado (Fase 0)

- Contraseñas con bcrypt (12 rondas). Política: mínimo 10 caracteres, con letras y números.
- Access JWT de 15 min. Refresh token aleatorio de 384 bits, guardado como hash, rotativo y con detección de reutilización.
- Rate limiting global y estricto en registro y login.
- Helmet, CORS restringido a `CORS_ORIGINS` y validación zod de todas las entradas.
- Logs con redacción de `authorization`, `password` y `refreshToken`.
- `audit_logs` para registro, login, login fallido y reutilización de refresh token.
- Aislamiento multi-organización mediante `OrgMemberGuard`.
- Variables de entorno validadas. `.env` está fuera del control de versiones.

## Previsto

- **QR (Fase 2):** token aleatorio de sala con expiración configurable. Solo se guarda su hash (`rooms.join_code_hash`). Es renovable y no incluye credenciales administrativas.
- **Invitados:** JWT corto con alcance a una sola sala.
- **Credenciales de proveedores:** cifradas con AES-256-GCM antes de guardarse en `music_providers.credentials_enc`.

## Limitaciones conocidas

- **Refresh token web en `localStorage`:** es vulnerable si hay XSS. Cuando web y API compartan dominio en producción, debe moverse a una cookie `httpOnly; Secure; SameSite=Strict`.
- **Configuración de LiveKit de desarrollo:** usa claves fijas y TURN desactivado. **No usar en producción.**

## Escalabilidad horizontal

- La API no guarda estado: sesiones en Postgres, presencia y pub/sub en Redis, y adaptador Redis de Socket.IO.
- LiveKit escala por nodos usando Redis.
- Las tareas pesadas van al worker (BullMQ).
