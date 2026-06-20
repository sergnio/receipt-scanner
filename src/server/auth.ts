import { createServerFn } from '@tanstack/react-start'
import { useSession } from '@tanstack/react-start/server'
import { z } from 'zod'

// Single shared-password gate so the app isn't open to the world. The session
// is an encrypted, httpOnly cookie (TanStack's useSession seals it with
// SESSION_SECRET), so the browser never holds anything forgeable. maxAge keeps
// you logged in for 30 days.

const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, in seconds

type AppSession = { authed?: boolean }

function getAppSession() {
  const password = process.env.SESSION_SECRET
  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to a string of at least 32 characters for authentication.',
    )
  }
  return useSession<AppSession>({
    password,
    name: 'rs-auth',
    maxAge: SESSION_MAX_AGE,
  })
}

export const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await getAppSession()
  return { authed: session.data.authed === true }
})

export const login = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const expected = process.env.APP_PASSWORD
    if (!expected) {
      throw new Error('APP_PASSWORD is not set on the server.')
    }
    if (data.password !== expected) {
      return { ok: false as const }
    }
    const session = await getAppSession()
    await session.update({ authed: true })
    return { ok: true as const }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const session = await getAppSession()
  await session.clear()
  return { ok: true as const }
})
