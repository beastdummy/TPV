import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/dashboard/')({ component: DashboardHomePage })

function DashboardHomePage() {
  return (
    <InternalShell title="Panel de cliente" kicker="Dashboard">
      <p>
        Vista resumen: licencia, negocio y accesos. Sin sesión real ni datos aún: conecta
        con la API cuando exista (ver <code>WEB_TO_TPV_CONTEXT.md</code>).
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
