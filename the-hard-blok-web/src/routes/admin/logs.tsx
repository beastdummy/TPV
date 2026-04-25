import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/admin/logs')({ component: Page })

function Page() {
  return (
    <InternalShell title="Registros" kicker="Admin">
      <p>Auditoría y trazas de sistema o facturación. Contenido: fase futura.</p>
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
