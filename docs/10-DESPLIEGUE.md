# 10 · Despliegue

## Entornos

| Entorno    | Base de datos                                  | Configuración                         |
| ---------- | ---------------------------------------------- | ------------------------------------- |
| Desarrollo | `karaoke` (Docker local, :5434)                | `apps/api/.env`                       |
| Pruebas    | `karaoke_test` (Docker local o servicio de CI) | `test/setup-env.ts` / variables de CI |
| Producción | PostgreSQL gestionado (Supabase u otro)        | variables del proveedor de hosting    |

## Contenedores

```bash
docker compose up -d                      # infraestructura
docker compose --profile app up -d --build  # + API y worker en contenedores
```

- `apps/api/Dockerfile`: multi-stage, usuario sin privilegios, aplica `prisma migrate deploy` al arrancar y HEALTHCHECK sobre `/v1/health`.
- `apps/worker/Dockerfile`: igual, sin puertos expuestos.

## Producción (lista de verificación)

- [ ] Dominio y HTTPS (requisito para micrófonos en navegador).
- [ ] `JWT_ACCESS_SECRET` aleatorio (≥ 48 bytes).
- [ ] LiveKit con claves propias, TURN/TLS en el 443 y `use_external_ip: true`.
- [ ] `CORS_ORIGINS` con el dominio real.
- [ ] Copias de seguridad de Postgres y monitoreo de `/v1/health`.

## Celular físico en desarrollo

En `apps/mobile/app.json`, cambiar `extra.apiUrl` por `http://<IP-LAN-del-PC>:3000`. Por defecto usa `10.0.2.2`, que es el localhost del PC visto desde el emulador.

## Android

```bash
pnpm --filter @ks/mobile build:apk   # APK de prueba (EAS)
pnpm --filter @ks/mobile build:aab   # AAB para Play Store
```
