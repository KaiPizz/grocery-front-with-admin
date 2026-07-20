FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_SALON_SLUG
ENV NEXT_PUBLIC_SALON_SLUG=$NEXT_PUBLIC_SALON_SLUG
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN test -n "$NEXT_PUBLIC_SALON_SLUG" && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4100

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/scripts/container-entrypoint.mjs /usr/local/lib/admin-container-entrypoint.mjs

# The entrypoint starts as root only to validate/bootstrap the persistent
# volume, then irreversibly drops to nextjs before loading the application.
RUN mkdir -p /app/shared && chown root:root /app/shared && chmod 755 /app/shared

EXPOSE 4100

ENTRYPOINT ["node", "/usr/local/lib/admin-container-entrypoint.mjs"]
