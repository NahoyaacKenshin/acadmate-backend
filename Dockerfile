# ==============================================================================
# AcadMate Backend — Multi-Stage Production Dockerfile
# Node.js 22 on Alpine Linux (Lightweight, Secure, Fast)
# ==============================================================================

# ── Stage 1: Build & Dependencies ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install native dependencies required by Prisma engine & Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy package descriptors
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install dependencies (clean install)
RUN npm ci

# Generate Prisma Client (outputs to src/generated/prisma)
RUN npx prisma generate

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ── Stage 2: Production Runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Prisma and process signal handling
RUN apk add --no-cache openssl libc6-compat dumb-init curl

ENV NODE_ENV=production
ENV PORT=8000

# Create a dedicated non-root system user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 acadmate

# Copy package definitions
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy generated Prisma Client and source code
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/dist ./dist
COPY src ./src

# Change ownership to non-root user
RUN chown -R acadmate:nodejs /app

USER acadmate

EXPOSE 8000

# Health check to ensure the container is alive and responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# dumb-init ensures PID 1 properly handles graceful shutdown (SIGTERM/SIGINT)
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["npm", "start"]
