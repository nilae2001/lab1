// server/auth/kinde.ts
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { SessionManager } from '@kinde-oss/kinde-typescript-sdk'
import { createKindeServerClient, GrantType } from '@kinde-oss/kinde-typescript-sdk'

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://lab1-zhv8.onrender.com/'

export const kindeClient = createKindeServerClient(GrantType.AUTHORIZATION_CODE, {
  authDomain: process.env.KINDE_ISSUER_URL!,
  clientId: process.env.KINDE_CLIENT_ID!,
  clientSecret: process.env.KINDE_CLIENT_SECRET!,
  redirectURL: process.env.KINDE_REDIRECT_URI!,
  logoutRedirectURL: FRONTEND_URL,
})

// Manual cookie parsing and setting for Hono v4
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {}
  
  return cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name && rest.length > 0) {
      acc[name] = decodeURIComponent(rest.join('='))
    }
    return acc
  }, {})
}

function getCookieValue(c: Context, key: string): string | null {
  const cookieHeader = c.req.header('Cookie')
  const cookies = parseCookies(cookieHeader)
  return cookies[key] ?? null
}

function setCookieValue(c: Context, key: string, value: string) {
  const cookieOptions = [
    `${key}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ]
  
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure')
  }
  
  c.header('Set-Cookie', cookieOptions.join('; '), { append: true })
}

function deleteCookieValue(c: Context, key: string) {
  c.header('Set-Cookie', `${key}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`, { append: true })
}

// Minimal cookie-backed SessionManager for Hono.
// The SDK will call these to persist state/tokens per session.
export function sessionFromHono(c: Context): SessionManager {
  return {
    async getSessionItem(key: string) {
      return getCookieValue(c, key)
    },
    async setSessionItem(key: string, value: unknown) {
      setCookieValue(c, key, String(value))
    },
    async removeSessionItem(key: string) {
      deleteCookieValue(c, key)
    },
    async destroySession() {
      const keys = ['access_token', 'id_token', 'refresh_token', 'session', 'state', 'code_verifier']
      for (const k of keys) {
        deleteCookieValue(c, k)
      }
    },
  }
}

export const authRoute = new Hono()
  // 1) Start login: get hosted login URL from SDK and redirect
  .get('/login', async (c) => {
    try {
      const session = sessionFromHono(c)
      const url = await kindeClient.login(session)
      return c.redirect(url.toString())
    } catch (error) {
      console.error('Login error:', error)
      return c.json({ error: 'Failed to initiate login' }, 500)
    }
  })

  // 2) OAuth callback: hand the full URL to the SDK to validate and store tokens
  .get('/callback', async (c) => {
    try {
      const session = sessionFromHono(c)
      await kindeClient.handleRedirectToApp(session, new URL(c.req.url))
      return c.redirect(`${FRONTEND_URL}/expenses`)
    } catch (error) {
      console.error('Callback error:', error)
      return c.redirect(`${FRONTEND_URL}?error=auth_failed`)
    }
  })

  // 3) Logout via SDK: clears SDK-managed session and redirects
  .get('/logout', async (c) => {
    try {
      const session = sessionFromHono(c)
      await kindeClient.logout(session)
      return c.redirect(FRONTEND_URL)
    } catch (error) {
      console.error('Logout error:', error)
      return c.redirect(FRONTEND_URL)
    }
  })

  // 4) Current user (profile)
  .get('/me', async (c) => {
    const session = sessionFromHono(c)
    try {
      const profile = await kindeClient.getUserProfile(session)
      return c.json({ user: profile })
    } catch (error) {
      return c.json({ user: null })
    }
  })