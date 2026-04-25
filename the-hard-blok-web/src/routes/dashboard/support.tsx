import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/dashboard/support')({ component: Page })

function Page() {
  return (
    <InternalShell title="Soporte" kicker="Dashboard">
      <p>
        Tickets, FAQ o enlace a email comercial. Integración con helpdesk: más adelante.
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
