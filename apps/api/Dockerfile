# Imagen de producción de la API (multi-stage). Construir desde la raíz del monorepo.
FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache openssl
WORKDIR /repo

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@ks/api...
RUN pnpm deploy --filter=@ks/api --prod --legacy /out && cp -r apps/api/dist apps/api/prisma /out/ \
    && cd /out && npx prisma generate

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl && addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /out .
USER app
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://localhost:3000/v1/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
