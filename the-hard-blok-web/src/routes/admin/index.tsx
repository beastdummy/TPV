import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../../components/InternalShell'

export const Route = createFileRoute('/admin/')({ component: AdminHomePage })

function AdminHomePage() {
  return (
    <InternalShell title="Administración" kicker="Admin">
      <p>
        Panel interno para licencias, usuarios y operaciones. Sin auth en esta fase: solo
        estructura de rutas según <code>WEB_ROADMAP.md</code>.
      </p>
      <ul className="m-0 list-disc space-y-1 pl-5">
        <li>
          <Link
            to="/admin/users"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Usuarios
          </Link>
        </li>
        <li>
          <Link
            to="/admin/licenses"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Licencias
          </Link>
        </li>
        <li>
          <Link
            to="/admin/payments"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Pagos
          </Link>{' '}
          (placeholder; sin Stripe)
        </li>
        <li>
          <Link
            to="/admin/logs"
            className="font-medium text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Registros / logs
          </Link>
        </li>
      </ul>
    </InternalShell>
  )
}
