import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../components/InternalShell'

export const Route = createFileRoute('/pricing')({ component: PricingPage })

function PricingPage() {
  return (
    <InternalShell title="Precios" kicker="Comercial">
      <p>
        Página detallada de planes y condiciones. Los importes y el checkout (Stripe) son
        fase futura; el contenido comercial se negocia con ventas reales.
      </p>
      <p>
        Resumen rápido: <strong>Local</strong>, <strong>Crecimiento</strong> y{' '}
        <strong>Enterprise</strong> — ver bloque de planes en la{' '}
        <Link
          to="/"
          className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          portada
        </Link>
        .
      </p>
    </InternalShell>
  )
}
