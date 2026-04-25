import { Link } from '@tanstack/react-router'

import { SITE_IMAGES } from '../../config/site-assets'
import { SiteImage } from '../SiteImage'

export function ShowcaseSection() {
  return (
    <section className="mt-8">
      <div className="island-shell rise-in grid gap-0 overflow-hidden rounded-2xl p-0 lg:grid-cols-2">
        <div className="relative min-h-[220px] sm:min-h-[280px]">
          <SiteImage
            src={SITE_IMAGES.showcase}
            fallbackSrc="/images/hero-default.svg"
            alt="The Hard Blok TPV en entorno de hostelería"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <h2 className="island-kicker mb-2">Hecho para bares, cafeterías y restaurantes</h2>
          <p className="m-0 text-lg font-semibold leading-snug text-[var(--sea-ink)] sm:text-xl">
            Un TPV coherente con el ritmo de sala y caja, sin papeleo de más.
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--sea-ink-soft)]">
            La misma arquitectura de producto, licencias y panel cliente que comercializamos
            aquí — presentación web, lógica fuerte en el TPV.
          </p>
          <div className="mt-4">
            <Link
              to="/demo"
              className="inline-flex rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.16)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:bg-[rgba(79,184,178,0.28)]"
            >
              Ver solicitud de demo
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
