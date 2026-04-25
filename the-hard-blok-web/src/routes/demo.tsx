import { createFileRoute, Link } from '@tanstack/react-router'

import { InternalShell } from '../components/InternalShell'
import { SiteImage } from '../components/SiteImage'
import { SITE_IMAGES } from '../config/site-assets'

export const Route = createFileRoute('/demo')({ component: DemoPage })

function DemoPage() {
  return (
    <InternalShell title="Solicitar demo" kicker="Contacto">
      <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
        <SiteImage
          src={SITE_IMAGES.demo}
          fallbackSrc="/images/demo-default.svg"
          alt="Ilustración: agenda tu demostración del TPV"
          className="h-auto w-full object-cover object-center aspect-[9/5] sm:aspect-[2/1]"
        />
      </div>
      <p>
        Formulario de contacto, calendario o email comercial: se conectará cuando definas
        el canal. Esta ruta cumple el CTA &quot;Demo&quot; del roadmap.
      </p>
      <p>
        Mientras tanto, el TPV de producto vive en el repositorio <code>TPV/</code>{' '}
        (TanStack Start + PostgreSQL) y es la referencia de features.
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
