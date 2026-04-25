/**
 * URL base del TPV (app) — auth y producto viven ahí (opción 2: web + app separados).
 * @see .env.example
 */
export function getTpvAppBaseUrl(): string {
  const v = import.meta.env.VITE_TPV_APP_URL
  if (typeof v === 'string' && v.length > 0) {
    return v.replace(/\/$/, '')
  }
  return 'http://localhost:3000'
}

/**
 * Ruta de alta en el TPV. Hasta que exista /register, misma entrada que login (p. ej. Google).
 */
export function getTpvRegisterPath(): string {
  const p = import.meta.env.VITE_TPV_REGISTER_PATH
  if (typeof p === 'string' && p.startsWith('/')) {
    return p
  }
  return '/login'
}

/**
 * URL absoluta al TPV con query opcional.
 */
export function tpvAppUrl(
  path: string,
  search?: Record<string, string | undefined | null>,
): string {
  const base = getTpvAppBaseUrl()
  const pathPart = path.startsWith('/') ? path : `/${path}`
  const u = new URL(pathPart, `${base}/`)
  if (search) {
    for (const [k, v] of Object.entries(search)) {
      if (v != null && v !== '') {
        u.searchParams.set(k, v)
      }
    }
  }
  return u.toString()
}
