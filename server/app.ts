// server/app.ts
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { serveStatic } from "hono/serve-static";

import { expensesRoute } from "./routes/expenses";
import { authRoute } from "./auth/kinde";
import { secureRoute } from "./routes/secure";
import { uploadRoute } from "./routes/upload";

export const app = new Hono();

// --------------------
// Middleware
// --------------------

// Logger for all requests
app.use("*", logger());

// Custom timing middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  c.header("X-Response-Time", `${ms}ms`);
});

// CORS for API routes
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --------------------
// API routes
// --------------------
app.route("/api/auth", authRoute);
app.route("/api/upload", uploadRoute);
app.route("/api/secure", secureRoute);
app.route("/api/expenses", expensesRoute);

// --------------------
// Health check & root
// --------------------
app.get("/", (c) => c.json({ message: "OK" }));
app.get("/health", (c) => c.json({ status: "healthy" }));

// --------------------
// Static frontend files
// --------------------
app.use(
  "/*",
  serveStatic({
    root: "./server/public",
    getContent: async (path, c) => {
      try {
        const cleanPath = path.startsWith("/") ? path.slice(1) : path;
        return await Bun.file(`./server/public/${cleanPath}`).arrayBuffer();
      } catch {
        return null;
      }
    },
  })
);

// --------------------
// SPA fallback for frontend routing
// --------------------
app.get("*", async (c, next) => {
  if (c.req.url.startsWith("/api")) return next();
  try {
    return c.html(await Bun.file("./server/public/index.html").text());
  } catch {
    return c.text("Not found", 404);
  }
});

export default app;
