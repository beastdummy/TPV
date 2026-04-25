import { Link } from '@tanstack/react-router'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-[var(--line)] px-4 pb-14 pt-10 text-[var(--sea-ink-soft)]">
      <div className="page-wrap grid gap-8 sm:grid-cols-2">
        <div>
          <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">The Hard Blok</p>
          <p className="mt-2 text-sm">
            TPV para hostelería. Web pública: capa comercial y de gestión; el TPV en{' '}
            <code>TPV/</code> mantiene la lógica de producto.
          </p>
          <p className="mt-3 text-sm">&copy; {year} The Hard Blok. Todos los derechos reservados.</p>
        </div>
        <div className="flex flex-col gap-2 text-sm sm:items-end">
          <p className="m-0 font-semibold text-[var(--sea-ink)]">Enlaces</p>
          <Link
            to="/pricing"
            className="text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Precios
          </Link>
          <Link to="/demo" className="text-[var(--lagoon-deep)] no-underline hover:underline">
            Demo
          </Link>
          <Link to="/docs" className="text-[var(--lagoon-deep)] no-underline hover:underline">
            Documentación
          </Link>
          <span className="pt-1 text-xs text-[var(--sea-ink-soft)]">Área interna (placeholders)</span>
          <Link
            to="/dashboard"
            className="text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Panel cliente
          </Link>
          <Link
            to="/admin"
            className="text-[var(--lagoon-deep)] no-underline hover:underline"
          >
            Admin
          </Link>
        </div>
      </div>
      <p className="page-wrap mt-6 text-center text-xs text-[var(--sea-ink-soft)] sm:text-left">
        Pagos, webhooks y activación de licencias: fase futura (sin Stripe en esta
        versión).
      </p>
    </footer>
  )
}
