FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm turbo run build --filter=@ks/worker...
RUN pnpm deploy --filter=@ks/worker --prod --legacy /out && cp -r apps/worker/dist /out/

FROM node:22-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build --chown=app:app /out .
USER app
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
