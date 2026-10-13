# Multi-stage Dockerfile for Zapuza Factory Operations & Quality Control System

# Stage 1: Build Frontend Client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production Server Runner
FROM node:22-alpine AS production
WORKDIR /app

# Copy backend dependencies and install production packages
COPY package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend client from Stage 1 into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Expose production port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

CMD ["node", "server/server.js"]
