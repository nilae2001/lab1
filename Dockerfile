# syntax=docker/dockerfile:1
FROM oven/bun:1 as base
WORKDIR /app

# --- Install backend dependencies ---
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Build frontend ---
COPY frontend ./frontend
WORKDIR /app/frontend

# Install frontend deps
RUN bun install --frozen-lockfile || bun install

# Build frontend
RUN bun run build

WORKDIR /app

# --- Copy server and compiled frontend ---
COPY server ./server
RUN mkdir -p server/public && cp -r frontend/dist/* server/public/

# DEBUG: Show what files were copied
RUN echo "=== Files in server/public ===" && ls -la server/public/

# --- Final runtime image ---
FROM oven/bun:1 as runtime
WORKDIR /app
COPY --from=base /app /app

# DEBUG: Confirm files in final image
RUN echo "=== Files in final image ===" && ls -la /app/server/public/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "server/index.ts"]