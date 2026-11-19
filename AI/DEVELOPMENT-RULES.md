# Reglas de desarrollo

1. **Nada ficticio:** ni botones decorativos, ni datos simulados presentados como reales, ni módulos vacíos.
2. **Límites de las API:** si una API no permite una función, se documenta la limitación y se ofrece una alternativa legal.
3. **Lógica de negocio fuera de los controladores:** va en servicios (back) o en `@ks/business-logic` (lógica pura compartida).
4. **Contratos:** cada tipo que cruza la red vive en `@ks/shared-types`. Cada entrada se valida con `@ks/validation`.
5. **Datos por organización:** toda consulta de dominio filtra por `organizationId` o pasa por un guard que lo garantiza.
6. **Estado:** nunca solo en memoria del proceso (Postgres o Redis).
7. **Audio:** solo por LiveKit. Nunca por Socket.IO.
8. **Secretos:** solo en variables de entorno, nunca en código, en un QR ni en logs.
9. **Dependencias:** cada nueva dependencia debe justificarse.
10. **Cada PR:** `pnpm lint && pnpm typecheck && pnpm test` en verde y documentación actualizada.
