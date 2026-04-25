import { createFileRoute, Link } from '@tanstack/react-router'
import { useLayoutEffect, useState } from 'react'

import { InternalShell } from '../components/InternalShell'
import { getTpvAppBaseUrl, tpvAppUrl } from '../lib/tpv-app-url'

type LoginSearch = {
  redirect?: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect } = Route.useSearch()
  const [failed, setFailed] = useState(false)
  const target = tpvAppUrl(
    '/login',
    redirect ? { redirect } : undefined,
  )

  useLayoutEffect(() => {
    try {
      window.location.replace(target)
    } catch {
      setFailed(true)
    }
  }, [target])

  if (failed) {
    return (
      <InternalShell title="Iniciar sesión" kicker="TPV">
        <p>
          No se pudo redirigir automáticamente. Abre el TPV (app) en:{' '}
          <a href={target} className="font-semibold text-[var(--lagoon-deep)]">
            {target}
          </a>
        </p>
        <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
          Base configurada: <code>{getTpvAppBaseUrl()}</code> — ajusta{' '}
          <code>VITE_TPV_APP_URL</code> en <code>.env</code> si hace falta.
        </p>
        <p>
          <Link
            to="/"
            className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Volver al inicio
          </Link>
        </p>
      </InternalShell>
    )
  }

  return (
    <main className="page-wrap px-4 py-16 text-center">
      <p className="text-sm text-[var(--sea-ink-soft)]">Redirigiendo al TPV…</p>
      <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
        Si tarda,{' '}
        <a href={target} className="font-medium text-[var(--lagoon-deep)]">
          pulsa aquí
        </a>
        .
      </p>
    </main>
  )
}
