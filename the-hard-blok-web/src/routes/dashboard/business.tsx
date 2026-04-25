import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/dashboard/business')({ component: Page })

function Page() {
  return (
    <InternalShell title="Negocio" kicker="Dashboard">
      <p>
        Datos del establecimiento o cadena, alineados con el modelo de negocio del TPV
        (nombres, impuestos, ajustes comerciales cuando la API esté lista).
      </p>
      <p>
        <Link
          to="/dashboard"
          className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          Volver al panel
        </Link>
      </p>
    </InternalShell>
  )
}
