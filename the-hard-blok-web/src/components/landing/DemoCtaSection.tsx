import { Link } from '@tanstack/react-router'

export function DemoCtaSection() {
  return (
    <section className="island-shell rise-in mt-8 rounded-2xl p-6 sm:p-8">
      <h2 className="island-kicker mb-2">Demostración</h2>
      <p className="m-0 mb-4 max-w-2xl text-sm text-[var(--sea-ink-soft)]">
        Reserva un walkthrough con el equipo, ve el TPV alineado con el roadmap de la web y
        deja claro el siguiente paso técnico (entorno, licencia, despliegue).
      </p>
      <Link
        to="/demo"
        className="inline-flex rounded-full border border-[rgba(50,143,151,0.35)] bg-[rgba(79,184,178,0.2)] px-5 py-2.5 text-sm font-semibold text-[var(--lagoon-deep)] no-underline transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.3)]"
      >
        Ir a contacto / demo
      </Link>
    </section>
  )
}
