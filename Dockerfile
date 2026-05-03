# syntax=docker/dockerfile:1.7
# Multi-stage build for Next.js standalone on Cloud Run.

FROM node:22-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json* ./
# Use npm install (not ci) to tolerate optional peer-dep skews across npm versions.
# Lockfile is still committed; install respects it where it can and resolves
# the transitive picomatch peer-dep range that npm@10 vs npm@11 disagree on.
RUN npm install --no-audit --no-fund --prefer-offline

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY web/ ./
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
# Next.js 16 standalone output places the runtime under
# `.next/standalone/sentinelcloud/web/` when the build context is the repo root.
# We flatten that here so the entrypoint stays `node server.js`.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/sentinelcloud/web/ ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 8080
CMD ["node", "server.js"]
