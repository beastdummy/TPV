import { Link } from '@tanstack/react-router'

import { SITE_IMAGES } from '../../config/site-assets'
import { SiteImage } from '../SiteImage'

export function HeroSection() {
  return (
    <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
      <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />

      <div className="relative grid gap-10 lg:grid-cols-[1fr_min(42%,400px)] lg:items-center">
        <div>
          <p className="island-kicker mb-3">The Hard Blok TPV</p>
          <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl lg:text-6xl">
            TPV de hostelería, listo para vender y escalar.
          </h1>
          <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
            Catálogo, caja, tickets y administración en un solo producto. Misma lógica que
            nuestro TPV de escritorio: sin duplicar reglas de negocio en la web pública — la
            web presenta, vende y prepara licencias; el TPV es la fuente de verdad.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)]"
            >
              Pedir demo
            </Link>
            <Link
              to="/pricing"
              className="rounded-full border border-[rgba(23,58,64,0.2)] bg-white/50 px-5 py-2.5 text-sm font-semibold text-[var(--sea-ink)] no-underline transition hover:-translate-y-0.5 hover:border-[rgba(23,58,64,0.35)]"
            >
              Ver planes
            </Link>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="ring-1 ring-[var(--line)] ring-inset overflow-hidden rounded-2xl bg-[var(--surface)] shadow-[0_20px_50px_rgba(30,90,72,0.12)]">
            <SiteImage
              src={SITE_IMAGES.hero}
              fallbackSrc="/images/hero-default.svg"
              alt="Vista resumida del TPV: caja, catálogo y flujo de venta"
              className="h-auto w-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
