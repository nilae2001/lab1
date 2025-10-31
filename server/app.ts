// server/app.ts
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";

import { expensesRoute } from "./routes/expenses";
import { authRoute } from "./auth/kinde";
import { secureRoute } from "./routes/secure";
import { uploadRoute } from "./routes/upload";

export const app = new Hono();

// --------------------
// Middleware
// --------------------
app.use("*", logger());

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
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://lab1-zhv8.onrender.com"
    ],
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
// Health check
// --------------------
app.get("/health", (c) => c.json({ status: "healthy" }));

// --------------------
// Static file serving with proper MIME types
// --------------------
app.get("*", async (c) => {
  const path = c.req.path;
  
  // Skip API routes
  if (path.startsWith("/api")) {
    return c.notFound();
  }
  
  try {
    // Determine file path
    let filePath = path === "/" ? "/index.html" : path;
    const fullPath = `./server/public${filePath}`;
    
    console.log(`Attempting to serve: ${fullPath}`);
    
    const file = Bun.file(fullPath);
    const exists = await file.exists();
    
    if (exists) {
      // Set proper Content-Type based on file extension
      const ext = filePath.split(".").pop()?.toLowerCase();
      const mimeTypes: Record<string, string> = {
        html: "text/html; charset=utf-8",
        css: "text/css; charset=utf-8",
        js: "application/javascript; charset=utf-8",
        json: "application/json; charset=utf-8",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
      };
      
      const contentType = mimeTypes[ext || ""] || "application/octet-stream";
      c.header("Content-Type", contentType);
      
      return c.body(await file.arrayBuffer());
    }
    
    // SPA fallback - serve index.html for client-side routes
    console.log(`File not found, serving index.html as SPA fallback`);
    const indexFile = Bun.file("./server/public/index.html");
    
    if (await indexFile.exists()) {
      c.header("Content-Type", "text/html; charset=utf-8");
      return c.body(await indexFile.arrayBuffer());
    }
    
    return c.text("Not found", 404);
  } catch (error) {
    console.error("Error serving file:", error);
    return c.text("Internal server error", 500);
  }
});

export default app;