import { Link } from '@tanstack/react-router'

const plans: { name: string; price: string; blurb: string; highlight?: boolean }[] = [
  {
    name: 'Local',
    price: 'A medida',
    blurb: 'Un establecimiento, despliegue y soporte según acuerdo.',
  },
  {
    name: 'Crecimiento',
    price: 'A medida',
    blurb: 'Varias cajas o sedes, roles y reportes. Ideal para cadenas pequeñas.',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Hablemos',
    blurb: 'Integraciones, SLA y roadmap conjunto. Stripe y facturación en fase futura.',
  },
]

export function PricingSection() {
  return (
    <section className="island-shell mt-8 rise-in rounded-2xl p-6 sm:p-8">
      <h2 className="island-kicker mb-2">Planes</h2>
      <p className="m-0 mb-6 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
        Números y checkout real (Stripe) no están activos en esta fase. Aquí se muestra la
        estructura comercial prevista; el detalle contractual irá con ventas reales.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={
              plan.highlight
                ? 'rounded-2xl border-2 border-[rgba(50,143,151,0.45)] bg-[rgba(79,184,178,0.1)] p-5'
                : 'rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5'
            }
          >
            <p className="m-0 text-sm font-bold text-[var(--sea-ink)]">{plan.name}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--lagoon-deep)]">{plan.price}</p>
            <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">{plan.blurb}</p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link
          to="/pricing"
          className="text-sm font-semibold text-[var(--lagoon-deep)] no-underline hover:underline"
        >
          Página de precios completa →
        </Link>
      </div>
    </section>
  )
}
