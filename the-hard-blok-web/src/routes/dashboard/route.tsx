import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { createContext, useContext, useLayoutEffect, useState } from 'react'

import { fetchTpvSession, type TpvSessionUser } from '../../lib/tpv-auth'
import { tpvAppUrl } from '../../lib/tpv-app-url'

const TpvUserContext = createContext<TpvSessionUser | null>(null)

const PLACEHOLDER_USER: TpvSessionUser = {
  id: 'tpv-session',
  email: '',
  name: 'Tu cuenta TPV',
  role: 'owner',
}

export function useTpvUser() {
  const user = useContext(TpvUserContext)
  if (!user) {
    throw new Error('useTpvUser debe usarse dentro del panel /dashboard')
  }
  return user
}

type DashboardSearch = {
  tpv?: string
}

export const Route = createFileRoute('/dashboard')({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    tpv: typeof search.tpv === 'string' ? search.tpv : undefined,
  }),
  component: DashboardLayout,
})

function DashboardLayout() {
  const { tpv } = Route.useSearch()
  const location = useRouterState({ select: (s) => s.location })
  const [tpvUser, setTpvUser] = useState<TpvSessionUser | null>(null)
  const [checking, setChecking] = useState(true)

  useLayoutEffect(() => {
    if (tpv === 'signed-in') {
      setTpvUser(PLACEHOLDER_USER)
      setChecking(false)
      return
    }

    let cancelled = false

    void fetchTpvSession().then((session) => {
      if (cancelled) return

      if (session.user) {
        setTpvUser(session.user)
        setChecking(false)
        return
      }

      const returnTo =
        typeof window !== 'undefined' ? window.location.href : undefined
      window.location.replace(
        tpvAppUrl('/login', returnTo ? { returnTo } : undefined),
      )
    })

    return () => {
      cancelled = true
    }
  }, [location.href, tpv])

  if (checking || !tpvUser) {
    return (
      <main className="page-wrap px-4 py-16 text-center text-sm text-[var(--sea-ink-soft)]">
        Comprobando sesión con el TPV…
      </main>
    )
  }

  return (
    <TpvUserContext.Provider value={tpvUser}>
      <Outlet />
    </TpvUserContext.Provider>
  )
}
