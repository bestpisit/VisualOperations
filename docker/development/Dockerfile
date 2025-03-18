# Install dependencies
FROM imbios/bun-node:18-slim AS deps-visops-dev
ARG DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Generate Prisma Client binaries for production environment
COPY prisma ./prisma
RUN npx prisma generate

# Build the app
FROM deps-visops-dev AS builder-visops-dev
WORKDIR /app
COPY . ./

RUN bun run build

# Production image
FROM node:23-alpine AS runner
WORKDIR /app

# Install OpenSSL using apk
RUN apk add --no-cache openssl

# Install Terraform
RUN apk add --no-cache openssl curl unzip && \
    curl -fsSL https://releases.hashicorp.com/terraform/1.11.0-beta1/terraform_1.11.0-beta1_linux_amd64.zip -o terraform.zip && \
    unzip terraform.zip -d /usr/local/bin/ && \
    rm terraform.zip && \
    npm install -g prisma && \
    npm cache clean --force

# Copy files from the builder
COPY --from=builder-visops-dev /app/prisma ./prisma
COPY --from=builder-visops-dev /app/public ./public
COPY --from=builder-visops-dev /app/.next/standalone ./
COPY --from=builder-visops-dev /app/.next/static ./.next/static
COPY --from=builder-visops-dev /app/.next/server/fonts ./.next/server/fonts
COPY --from=builder-visops-dev /app/.next/server/images ./.next/server/images
COPY --from=builder-visops-dev /app/default ./default

# Fix: Expose correct Next.js port
EXPOSE 3000
ENV PORT 3000

# Add HEALTHCHECK instruction
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/ || echo "Healthcheck failed" && exit 1

# Use correct server entry
CMD ["node", "server.js"]