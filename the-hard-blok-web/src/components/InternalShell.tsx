import { Link } from '@tanstack/react-router'

type InternalShellProps = {
  title: string
  kicker?: string
  children: React.ReactNode
}

export function InternalShell({ title, kicker, children }: InternalShellProps) {
  return (
    <main className="page-wrap px-4 py-10 sm:py-12">
      <p className="island-kicker mb-3">
        <Link
          to="/"
          className="font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          Inicio
        </Link>
        <span className="text-[var(--sea-ink-soft)]"> / </span>
        {kicker ?? 'Área privada'}
      </p>
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <h1 className="display-title mb-4 text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          {title}
        </h1>
        <div className="max-w-2xl space-y-3 text-sm leading-7 text-[var(--sea-ink-soft)]">
          {children}
        </div>
      </section>
    </main>
  )
}
