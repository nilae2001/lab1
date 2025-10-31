# syntax=docker/dockerfile:1
FROM oven/bun:1 as base
WORKDIR /app

# --- Install backend dependencies ---
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- Build frontend ---
COPY frontend ./frontend
WORKDIR /app/frontend

# ✅ install frontend deps (fixes your error)
RUN bun install --frozen-lockfile || bun install

# ✅ now build it
RUN bun run build

WORKDIR /app

# --- Copy server and compiled frontend ---
COPY server ./server
RUN mkdir -p server/public && cp -r frontend/dist/* server/public/

# --- Final runtime image ---
FROM oven/bun:1 as runtime
WORKDIR /app
COPY --from=base /app /app

ENV NODE_ENV=production
EXPOSE 3000
CMD ["bun", "run", "server/app.ts"]
