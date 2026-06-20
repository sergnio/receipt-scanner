/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import * as React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import { DefaultCatchBoundary } from '~/components/DefaultCatchBoundary'
import { NotFound } from '~/components/NotFound'
import { getAuth, logout } from '~/server/auth'
import appCss from '~/styles/app.css?url'
import { seo } from '~/utils/seo'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  beforeLoad: async ({ location }) => {
    const { authed } = await getAuth()
    if (!authed && location.pathname !== '/login') {
      throw redirect({ to: '/login' })
    }
    return { authed }
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      { name: 'theme-color', content: '#0f172a' },
      ...seo({
        title: 'Receipt Tracker',
        description: 'Scan receipts and track prices over time.',
      }),
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: (props) => (
    <RootDocument>
      <DefaultCatchBoundary {...props} />
    </RootDocument>
  ),
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
})

function RootComponent() {
  const { authed } = Route.useRouteContext()
  return (
    <RootDocument authed={authed}>
      <Outlet />
    </RootDocument>
  )
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      activeProps={{ className: 'active' }}
      activeOptions={to === '/' ? { exact: true } : undefined}
    >
      {label}
    </Link>
  )
}

function LogoutButton() {
  const router = useRouter()
  const [busy, setBusy] = React.useState(false)
  return (
    <button
      type="button"
      className="link-button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await logout()
        await router.invalidate()
        router.navigate({ to: '/login' })
      }}
    >
      Log out
    </button>
  )
}

function RootDocument({
  children,
  authed = false,
}: {
  children: React.ReactNode
  authed?: boolean
}) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <header className="app-header">
          <span className="brand">Receipt Tracker</span>
          {authed && (
            <nav className="app-nav">
              <NavLink to="/" label="Home" />
              <NavLink to="/capture" label="Scan" />
              <NavLink to="/receipts" label="Receipts" />
              <NavLink to="/products" label="Products" />
              <LogoutButton />
            </nav>
          )}
        </header>
        <main className="app-main">{children}</main>
        <TanStackRouterDevtools position="bottom-right" />
        <ReactQueryDevtools buttonPosition="bottom-left" />
        <Scripts />
      </body>
    </html>
  )
}
