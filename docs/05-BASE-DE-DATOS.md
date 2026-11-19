# 05 · Base de datos

PostgreSQL 16 con Prisma. El esquema está en `apps/api/prisma/schema.prisma` y las migraciones en `apps/api/prisma/migrations`.

## Tablas

| Tabla              | Propósito                                                            | Aislamiento   |
| ------------------ | -------------------------------------------------------------------- | ------------- |
| organizations      | inquilinos                                                           | —             |
| users              | cuentas administrativas                                              | —             |
| roles              | owner, admin, host, participant y sus permisos                       | catálogo      |
| memberships        | usuario ↔ organización ↔ rol                                         | org           |
| refresh_tokens     | sesiones (solo hash)                                                 | user          |
| rooms              | salas, hash del código QR y su expiración, `queue_version`           | org           |
| room_participants  | invitados por apodo, bloqueo                                         | room          |
| devices            | pantallas, paneles y celulares                                       | org           |
| music_providers    | proveedores habilitados y credenciales cifradas                      | org           |
| tracks             | metadatos normalizados de cualquier proveedor                        | org           |
| lyrics             | LRC o texto plano, offset y fuente                                   | track         |
| queue_items        | cola ordenada (`position`) con `version` para concurrencia optimista | room          |
| playback_sessions  | estado autoritativo del reproductor                                  | room          |
| audio_sessions     | sala LiveKit asociada                                                | room          |
| audio_participants | fuentes de audio (celular o externa), ganancia, mute                 | audio_session |
| audit_logs         | acciones relevantes de seguridad                                     | org           |
| settings           | configuración por organización o sala (JSON)                         | org           |

Todas las claves primarias son UUID y las claves foráneas usan `ON DELETE` explícito. Hay índices en las consultas calientes: `(room_id, status, position)`, `(organization_id, status)`, etc.

## Comandos

```bash
pnpm db:migrate                       # crear o aplicar migraciones (desarrollo)
pnpm --filter @ks/api prisma:deploy   # aplicar en pruebas o producción
```

Las grabaciones de voz **no se almacenan** en ninguna tabla.
