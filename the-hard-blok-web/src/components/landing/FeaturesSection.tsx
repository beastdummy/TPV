import { type LucideIcon, LayoutDashboard, LayoutGrid, Layers, Users } from 'lucide-react'

const features: { title: string; desc: string; Icon: LucideIcon }[] = [
  {
    title: 'Catálogo y caja',
    desc: 'Categorías, productos y flujo de venta alineado con el modelo del TPV (mismo vocabulario: tickets, caja, negocio).',
    Icon: LayoutGrid,
  },
  {
    title: 'Usuarios y roles',
    desc: 'Estructura preparada para permisos de equipo — coherente con el panel real del producto.',
    Icon: Users,
  },
  {
    title: 'Modular y vendible',
    desc: 'Pensado para licencias y planes. La activación en profundidad llegará con la API, sin reescribir la hostelería otra vez aquí.',
    Icon: Layers,
  },
  {
    title: 'Panel cliente (roadmap)',
    desc: 'Descargas, licencias, soporte y negocio en /dashboard: placeholders listos para conectar cuando exista backend.',
    Icon: LayoutDashboard,
  },
]

export function FeaturesSection() {
  return (
    <section className="mt-8">
      <h2 className="island-kicker mb-4">Qué ofrece el producto</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map(({ title, desc, Icon }, index) => (
          <article
            key={title}
            className="island-shell feature-card rise-in rounded-2xl p-5"
            style={{ animationDelay: `${index * 80 + 60}ms` }}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(50,143,151,0.25)] bg-[rgba(79,184,178,0.12)] text-[var(--lagoon-deep)]">
              <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <h3 className="mb-2 text-base font-semibold text-[var(--sea-ink)]">{title}</h3>
            <p className="m-0 text-sm text-[var(--sea-ink-soft)]">{desc}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
