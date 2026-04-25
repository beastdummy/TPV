import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/dashboard/downloads')({ component: Page })

function Page() {
  return (
    <InternalShell title="Descargas" kicker="Dashboard">
      <p>
        Instaladores o paquetes del TPV y versiones. Los binarios reales se enlazarán
        cuando el canal de distribución esté definido.
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
