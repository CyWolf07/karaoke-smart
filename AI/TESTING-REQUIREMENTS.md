# Requisitos de pruebas

- **Unitarias:** lógica pura (`@ks/business-logic`, validación de entorno, utilidades). Se usa Vitest (paquetes y web) y Jest (API).
- **Integración:** contra PostgreSQL y Redis **reales** (`karaoke_test`). No se simulan bases de datos ni sockets.
- **Aceptación:** las 13 pruebas de `docs/11`, ejecutadas en dispositivos reales y con los resultados anotados aquí.
- **CI:** cada push ejecuta formato, lint, typecheck, pruebas, build e imágenes Docker.

## Registro de resultados

### Fase 0 — 2026-11-18 (Windows 11, Node 24, Docker 29)

| Comando                     | Resultado                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`                 | 16/16 tareas OK                                                                                                                                                                                                           |
| `pnpm typecheck`            | 16/16 tareas OK (incluida la app móvil)                                                                                                                                                                                   |
| `pnpm build` (sin móvil)    | 9/9 OK                                                                                                                                                                                                                    |
| `@ks/api` Jest              | 13/13: health DB+Redis, Swagger, validación 400, registro, 409 duplicado, login 401/200, `/me`, rotación y reutilización de refresh, aislamiento entre organizaciones (403), Socket.IO sin token rechazado y `clock:sync` |
| `@ks/business-logic` Vitest | 4/4 (LRC, línea activa, reloj, slug)                                                                                                                                                                                      |
| `@ks/worker` Vitest         | 1/1 limpieza de tokens contra Postgres real                                                                                                                                                                               |
| `@ks/web` Vitest            | 1/1                                                                                                                                                                                                                       |

Las pruebas de aceptación 1 a 13 de `docs/11` todavía no aplican: corresponden a las fases 1 a 8.
