import { createFileRoute, Link } from '@tanstack/react-router'
import { useLayoutEffect, useState } from 'react'

import { InternalShell } from '../components/InternalShell'
import {
  getTpvAppBaseUrl,
  getTpvRegisterPath,
  getWebReturnTo,
  tpvAppUrl,
} from '../lib/tpv-app-url'

type RegisterSearch = {
  redirect?: string
}

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): RegisterSearch => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const [failed, setFailed] = useState(false)
  const path = getTpvRegisterPath()
  const returnTo = getWebReturnTo(redirect)
  const target = tpvAppUrl(path, returnTo ? { returnTo } : undefined)

  useLayoutEffect(() => {
    try {
      window.location.replace(target)
    } catch {
      setFailed(true)
    }
  }, [target])

  if (failed) {
    return (
      <InternalShell title="Crear cuenta" kicker="TPV">
        <p>
          No se pudo redirigir automáticamente. Abre el TPV en:{' '}
          <a href={target} className="font-semibold text-[var(--lagoon-deep)]">
            {target}
          </a>
        </p>
        <p className="m-0 text-xs text-[var(--sea-ink-soft)]">
          <code>VITE_TPV_APP_URL</code> = <code>{getTpvAppBaseUrl()}</code> — registro en ruta{' '}
          <code>{path}</code> en el TPV (misma cuenta Google que el login).
        </p>
        <p>
          <a
            href={tpvAppUrl('/login', returnTo ? { returnTo } : undefined)}
            className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Ir a iniciar sesión en el TPV
          </a>
          {' · '}
          <Link
            to="/"
            className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Inicio
          </Link>
        </p>
      </InternalShell>
    )
  }

  return (
    <main className="page-wrap px-4 py-16 text-center">
      <p className="text-sm text-[var(--sea-ink-soft)]">Llevándote al TPV para el alta…</p>
      <p className="mt-2 text-xs text-[var(--sea-ink-soft)]">
        <a href={target} className="font-medium text-[var(--lagoon-deep)]">
          Continuar
        </a>
      </p>
    </main>
  )
}
