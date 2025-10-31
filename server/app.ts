// server/app.ts
import { Hono } from "hono"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { serveStatic } from "hono/serve-static"

import { expensesRoute } from "./routes/expenses"
import { authRoute } from "./auth/kinde"
import { secureRoute } from "./routes/secure"
import { uploadRoute } from "./routes/upload"

export const app = new Hono()

// --------------------
// Middleware
// --------------------

// Logger for all requests
app.use("*", logger())

// CORS for API routes
app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
)

// Custom timing middleware
app.use("*", async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  c.header("X-Response-Time", `${ms}ms`)
})

// --------------------
// Static frontend files
// --------------------

// Serve static files from server/public
app.use(
  "/*",
  serveStatic({
    root: "./server/public",
    getContent: async (path, c) => {
      try {
        const file = Bun.file(`./server/public${path}`)
        return file ? await file.arrayBuffer() : null
      } catch {
        return null
      }
    },
  })
)

// --------------------
// API routes
// --------------------
app.route("/api/auth", authRoute)
app.route("/api/upload", uploadRoute)
app.route("/api/secure", secureRoute)
app.route("/api/expenses", expensesRoute)

// --------------------
// Health check & root
// --------------------
app.get("/", (c) => c.json({ message: "OK" }))
app.get("/health", (c) => c.json({ status: "healthy" }))

// --------------------
// SPA fallback for frontend routing
// --------------------
app.get("*", async (c, next) => {
  const url = new URL(c.req.url)
  if (url.pathname.startsWith("/api")) return next()

  try {
    // Always serve index.html for SPA routes
    return c.html(await Bun.file("./server/public/index.html").text())
  } catch {
    return c.text("Not found", 404)
  }
})

export default app
