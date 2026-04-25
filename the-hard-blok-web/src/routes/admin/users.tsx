import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/admin/users')({ component: Page })

function Page() {
  return (
    <InternalShell title="Usuarios" kicker="Admin">
      <p>Listado y roles de clientes o staff de plataforma. Datos: fase futura.</p>
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
