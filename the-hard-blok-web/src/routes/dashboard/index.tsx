import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'
import { tpvAppUrl } from '../../lib/tpv-app-url'
import { useTpvUser } from './route'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHomePage,
})

function DashboardHomePage() {
  const tpvUser = useTpvUser()

  return (
    <InternalShell title="Panel de cliente" kicker="Dashboard">
      <p>
        {tpvUser.email ? (
          <>
            Sesión activa en el TPV como <strong>{tpvUser.name}</strong> ({tpvUser.email}
            ), rol <code>{tpvUser.role}</code>.
          </>
        ) : (
          <>
            Has iniciado sesión en el TPV. Los datos de cuenta se gestionan en la app (
            <code>:3000</code>).
          </>
        )}
      </p>
      <p>
        La operación diaria (ventas, caja, catálogo) está en la app TPV:{' '}
        <a
          href={tpvAppUrl('/dashboard')}
          className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          abrir TPV
        </a>
        .
      </p>
      <ul className="m-0 list-disc space-y-1 pl-5">
        <li>
          <Link
            to="/dashboard/licenses"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Licencias
          </Link>
        </li>
        <li>
          <Link
            to="/dashboard/business"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Negocio
          </Link>
        </li>
        <li>
          <Link
            to="/dashboard/downloads"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Descargas
          </Link>
        </li>
        <li>
          <Link
            to="/dashboard/support"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Soporte
          </Link>
        </li>
      </ul>
    </InternalShell>
  )
}
