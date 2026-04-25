import { createFileRoute } from '@tanstack/react-router'

import { DemoCtaSection } from '../components/landing/DemoCtaSection'
import { FeaturesSection } from '../components/landing/FeaturesSection'
import { HeroSection } from '../components/landing/HeroSection'
import { PricingSection } from '../components/landing/PricingSection'
import { ShowcaseSection } from '../components/landing/ShowcaseSection'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main className="page-wrap px-4 pb-12 pt-8 sm:pt-10">
      <HeroSection />
      <FeaturesSection />
      <ShowcaseSection />
      <PricingSection />
      <DemoCtaSection />
    </main>
  )
}
