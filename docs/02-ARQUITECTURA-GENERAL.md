# 02 · Arquitectura general

```
 ┌──────────── Clientes ────────────┐
 │ web /screen  web /admin  /join   │   React (PWA)
 │ app móvil (Expo)                 │
 └──────┬──────────────┬──────────┬─┘
        │ REST /v1     │ Socket.IO│ WebRTC (audio)
        ▼              ▼          ▼
 ┌─────────────────────────┐  ┌──────────┐
 │ apps/api (NestJS) ×N    │  │ LiveKit  │  SFU + TURN
 └──┬──────────┬───────────┘  └────┬─────┘
    │          │ pub/sub, presencia │
    ▼          ▼                    │
 PostgreSQL   Redis ◄───────────────┘
               ▲
               │ colas BullMQ
          apps/worker
```

## Principios

1. **Módulos por dominio** (Auth, Rooms, Queue, Playback…): cada uno tiene controlador, servicio, DTO, interfaces y pruebas.
2. **Fuente de verdad central:** la API decide el estado de la sala (cola, reproducción). Los clientes solo envían intenciones.
3. **Sin estado solo en memoria:** sesiones en PostgreSQL y presencia en Redis. El adaptador Redis de Socket.IO permite varias instancias de la API.
4. **Contratos compartidos:** `@ks/shared-types` define los tipos y `@ks/validation` los esquemas, usados por front y back.
5. **El audio nunca pasa por Socket.IO:** va por LiveKit (WebRTC).
6. **Multi-organización:** toda tabla de dominio lleva `organization_id` y los guards validan la membresía.

## Módulos del backend

| Módulo                                              | Fase  | Estado          |
| --------------------------------------------------- | ----- | --------------- |
| Auth, Users, Organizations, Health, Realtime (base) | 0     | ✅ implementado |
| Rooms, Participants, Devices                        | 2     | pendiente       |
| Music, Providers, Playback, Queue                   | 3 / 6 | pendiente       |
| Lyrics                                              | 4     | pendiente       |
| Audio (tokens LiveKit)                              | 5     | pendiente       |
| Admin                                               | 6     | pendiente       |

No se crean módulos vacíos. Cada uno se añade con su funcionalidad real y sus pruebas.
