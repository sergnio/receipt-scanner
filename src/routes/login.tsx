import * as React from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { login } from '~/server/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(false)
    try {
      const res = await login({ data: { password } })
      if (res.ok) {
        // Re-run the root guard (now authed), then go home.
        await router.invalidate()
        router.navigate({ to: '/' })
      } else {
        setError(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: '20rem' }}>
      <h1>Sign in</h1>
      <p className="muted">Enter the password to use the receipt tracker.</p>
      <label>
        Password
        <br />
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p style={{ color: '#f87171' }}>Wrong password. Try again.</p>
      )}
      <div style={{ marginTop: '1rem' }}>
        <button type="submit" className="primary" disabled={busy || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    </form>
  )
}
