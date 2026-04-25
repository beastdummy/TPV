/**
 * Rutas bajo /public — servidas tal cual en Vite.
 * Ajusta solo si renombrar archivos en public/images/
 */
export const SITE_IMAGES = {
  /** imagen1 → hero: bloque principal de la portada */
  hero: '/images/hero.jpg',
  /** imagen2 → demo: página /demo y referencia en CTAs */
  demo: '/images/demo.jpg',
  /** imagen3 → showcase: franja en la home entre features y precios */
  showcase: '/images/showcase.jpg',
} as const
