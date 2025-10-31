// server/routes/health.ts
import { Hono } from 'hono'
export const healthRoute = new Hono().get('/', (c) => c.text('ok'))

// in app.ts
// app.route('/health', healthRoute)
