import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/admin/licenses')({ component: Page })

function Page() {
  return (
    <InternalShell title="Licencias (admin)" kicker="Admin">
      <p>
        Emisión, revocación y auditoría de licencias. Conectar con la misma verdad que el
        TPV sin reimplementar reglas de negocio en el cliente web.
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
