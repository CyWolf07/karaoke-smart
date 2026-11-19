# 04 · Arquitectura backend

NestJS 10 con estructura `src/<dominio>/`.

| Pieza                                                                   | Archivo                               |
| ----------------------------------------------------------------------- | ------------------------------------- |
| Arranque común (helmet, CORS, versionado URI, Swagger, adaptador Redis) | `src/bootstrap.ts`                    |
| Variables de entorno validadas con zod (la API no arranca si faltan)    | `src/config/env.ts`                   |
| Errores con formato uniforme `ApiError`, sin stack traces               | `src/common/all-exceptions.filter.ts` |
| Validación con esquemas compartidos                                     | `src/common/zod-validation.pipe.ts`   |
| Logs estructurados (pino) con request-id y redacción de secretos        | `app.module.ts`                       |
| Rate limiting global (120/min) y por ruta en auth                       | `@nestjs/throttler`                   |
| Prisma + roles sembrados al arrancar                                    | `src/database/`                       |

## Autenticación

- `POST /v1/auth/register`: crea usuario, organización y membresía `owner` en una transacción.
- `POST /v1/auth/login`: bcrypt (12 rondas). El tiempo de respuesta es igual exista o no la cuenta.
- `POST /v1/auth/refresh`: refresh token rotativo. Si se reutiliza un token, se revoca toda su familia.
- `POST /v1/auth/logout` y `GET /v1/auth/me`.
- Access JWT HS256 con `iss=karaoke-smart`. En la base solo se guarda el hash SHA-256 del refresh token.

## Autorización

- `JwtAuthGuard`: exige el header `Bearer`.
- `OrgMemberGuard`: cualquier ruta con `:orgId` exige membresía.
- **Fase 2:** `RoomAccessGuard`, para tokens de invitado limitados a una sala.

## Worker

BullMQ, cola `maintenance`. Tarea programada real: limpieza diaria (04:00) de refresh tokens caducados.
