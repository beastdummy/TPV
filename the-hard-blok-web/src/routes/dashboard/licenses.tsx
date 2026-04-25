import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/dashboard/licenses')({ component: Page })

function Page() {
  return (
    <InternalShell title="Licencias" kicker="Dashboard">
      <p>
        Gestión de claves, caducidad y asignación a dispositivos o sedes. Activación real:
        fase futura; no duplicar lógica del TPV aquí.
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
