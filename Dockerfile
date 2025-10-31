# syntax=docker/dockerfile:1
FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build frontend
COPY frontend ./frontend
RUN cd frontend && bun run build

# Copy server and compiled frontend
COPY server ./server
RUN mkdir -p server/public && cp -r frontend/dist/* server/public/

# Final runtime image
FROM oven/bun:1 as runtime
WORKDIR /app
COPY --from=base /app /app

ENV NODE_ENV=production
EXPOSE 3000

# 👇 Adjust this if your server entry file is named differently
CMD ["bun", "run", "server/index.ts"]
