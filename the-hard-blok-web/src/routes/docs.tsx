import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../components/InternalShell'

export const Route = createFileRoute('/docs')({ component: DocsPage })

function DocsPage() {
  return (
    <InternalShell title="Documentación" kicker="Docs">
      <p>
        En el futuro, <code>docs.thehardblok.com</code> puede alojar guías técnicas. En esta
        app, <code>/docs</code> es un marco vacío: enlaza aquí desde la barra de navegación
        y completa con Markdown o un portal cuando toque.
      </p>
      <p>
        <Link
          to="/"
          className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          Volver al inicio
        </Link>
      </p>
    </InternalShell>
  )
}
