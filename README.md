# Karaoke Smart

Plataforma de karaoke multiplataforma: un televisor o computador hace de pantalla principal, los celulares se conectan por QR, funcionan como micrófonos y sirven para pedir canciones.

> Estado: **Fase 0 — infraestructura base** (ver [docs/11](docs/11-FASES-DE-DESARROLLO.md)).

## Requisitos

- Node.js ≥ 20 (probado con 24), pnpm 10, Docker Desktop.

## Puesta en marcha

```bash
pnpm install
docker compose up -d              # PostgreSQL :5434, Redis :6380, LiveKit :7880
cp apps/api/.env.example apps/api/.env   # y cambiar JWT_ACCESS_SECRET
pnpm db:migrate                   # aplica migraciones a la base de desarrollo
pnpm dev                          # API :3000, web :5173, worker
```

- Web (panel de administración): http://localhost:5173
- API: http://localhost:3000/v1 — Swagger: http://localhost:3000/docs
- Salud: http://localhost:3000/v1/health
- Móvil: `pnpm --filter @ks/mobile start` (Expo).

## Calidad

```bash
pnpm lint && pnpm typecheck && pnpm test
```

Las pruebas de integración usan PostgreSQL y Redis reales (`karaoke_test`); requieren `docker compose up -d`.

## Estructura

```
apps/
  api/        NestJS · REST v1 · Socket.IO · Prisma · Swagger
  web/        React · Vite · Tailwind · shadcn/ui · Zustand · TanStack Query · PWA
  mobile/     Expo · React Native · Expo Router
  worker/     BullMQ (tareas en segundo plano)
packages/
  shared-types/     contratos (DTO, eventos Socket.IO)
  validation/       esquemas zod compartidos front/back
  business-logic/   lógica pura (LRC, reloj de reproducción)
  api-client/       cliente REST tipado
  realtime-client/  cliente Socket.IO tipado
  design-tokens/    colores, radios y espaciados
  config/           tsconfig y ESLint compartidos
infra/        configuración de Postgres y LiveKit
docs/         documentación técnica
AI/           reglas para el desarrollo asistido por IA
```
