# Portable production image for the CapTCF Private Beta.
# Use this for Fly.io, Railway, or any container host. Render users should use render.yaml instead.
#
# The image keeps dev tooling so it can run Drizzle migrations + the seed at boot (both idempotent).
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

# --- deps: install everything (dev deps drive the build + migrate/seed via tsx) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod=false

# --- build: compile the Next.js production bundle ---
FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# --- runner: migrate (idempotent) + seed (idempotent) + start ---
FROM base AS runner
ENV NODE_ENV=production
ENV STORAGE_LOCAL_DIR=/data/uploads
COPY --from=build /app ./
EXPOSE 3000
# PORT is honoured by the start script; platforms inject it automatically.
CMD ["sh", "-c", "pnpm db:migrate && pnpm db:seed && pnpm start"]
