# Single-service image: Express API + Next.js web app behind nginx on one origin.
# Render builds this from the repository root (dockerfilePath: ./Dockerfile).
# The API-only and web-only images remain at backend/Dockerfile and web/Dockerfile.

FROM node:22-bookworm-slim AS backend-build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build && cp src/db/schema.sql dist/db/schema.sql

FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS web-deps
WORKDIR /app
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS web-build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Empty by default: the browser uses same-origin /api and /uploads, which nginx proxies.
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=web-deps /app/node_modules ./node_modules
COPY web/ ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=10000
RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx-light \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-deps /app/node_modules ./backend/node_modules
COPY --from=backend-deps /app/package.json ./backend/package.json
COPY --from=backend-build /app/dist ./backend/dist
COPY backend/uploads/seed ./backend/seed-uploads
COPY --from=web-build /app/.next/standalone ./web
COPY --from=web-build /app/.next/static ./web/.next/static
COPY deploy/nginx-single.conf /etc/nginx/single.conf.template
COPY deploy/single-entrypoint.sh /usr/local/bin/single-entrypoint.sh
RUN chmod +x /usr/local/bin/single-entrypoint.sh \
  && mkdir -p /app/uploads /tmp/nginx \
  && chown -R node:node /app /tmp/nginx
USER node
EXPOSE 10000
ENTRYPOINT ["single-entrypoint.sh"]
