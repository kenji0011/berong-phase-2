# ===========================================
# BFP Berong - Multi-stage Docker Build
# Updated: December 2025
# ===========================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for native modules (OpenSSL for Prisma)
RUN apk add --no-cache libc6-compat openssl

# Install pnpm with specific version for reproducibility
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml* ./

# Install dependencies (frozen lockfile for reproducibility)
RUN pnpm install --frozen-lockfile --prefer-offline

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build-time environment variables
# Note: GEMINI_API_KEY and JWT_SECRET are provided at runtime via docker-compose
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"

# Build the application with increased memory
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache openssl wget

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nextjs

# Install pnpm for Prisma migrations at runtime
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

# Copy files with proper ownership from the start (more efficient)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy entrypoint script, fix line endings, set permissions, and create directories in one layer
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh && \
    mkdir -p /app/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -q --spider http://localhost:3000 || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
