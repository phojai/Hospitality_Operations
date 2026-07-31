# Multi-stage Dockerfile for Google Cloud Run Deployment
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy application source code
COPY . .

# Build the Vite frontend and bundle server.ts -> dist/server.cjs
RUN npm run build

# Production runner image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy dependency manifests and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built bundle and data folder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
