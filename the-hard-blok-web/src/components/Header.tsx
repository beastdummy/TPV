import { Link } from '@tanstack/react-router'

import { getTpvRegisterPath, tpvAppUrl } from '../lib/tpv-app-url'
import ThemeToggle from './ThemeToggle'

const tpvLoginHref = tpvAppUrl('/login')
const tpvRegisterHref = tpvAppUrl(getTpvRegisterPath())

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            The Hard Blok
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-3 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-1 sm:justify-end sm:pb-0">
          <Link
            to="/"
            className="nav-link"
            activeOptions={{ exact: true, includeHash: true }}
            activeProps={{ className: 'nav-link is-active' }}
          >
            Inicio
          </Link>
          <Link
            to="/pricing"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Precios
          </Link>
          <Link
            to="/demo"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Demo
          </Link>
          <Link
            to="/docs"
            className="nav-link"
            activeProps={{ className: 'nav-link is-active' }}
          >
            Docs
          </Link>
          <span className="hidden h-4 w-px bg-[var(--line)] sm:inline" aria-hidden />
          <a href={tpvLoginHref} className="nav-link">
            Entrar
          </a>
          <a
            href={tpvRegisterHref}
            className="rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.16)] px-3 py-1.5 text-[var(--lagoon-deep)] no-underline transition hover:bg-[rgba(79,184,178,0.28)]"
          >
            Registro
          </a>
        </div>
      </nav>
    </header>
  )
}
