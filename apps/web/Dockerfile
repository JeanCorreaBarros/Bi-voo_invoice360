# Build context = raiz del monorepo (necesita pnpm-workspace.yaml y apps/api
# para que pnpm resuelva el workspace, aunque solo se compile apps/web).
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS builder
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3005

COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

EXPOSE 3005

CMD ["node", "apps/web/server.js"]
