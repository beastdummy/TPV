import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/admin/payments')({ component: Page })

function Page() {
  return (
    <InternalShell title="Pagos" kicker="Admin">
      <p>
        Stripe, facturación y webhooks: <strong>no implementado</strong>. Esta ruta
        reserva el espacio del roadmap.
      </p>
      <p>
        <Link
          to="/admin"
          className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          Volver a administración
        </Link>
      </p>
    </InternalShell>
  )
}
