import { getTpvAppBaseUrl } from './tpv-app-url'

export type TpvSessionUser = {
  id: string
  email: string
  name: string
  role: string
}

export type TpvSessionResponse = {
  user: TpvSessionUser | null
  error?: string
}

/** Consulta la sesión del TPV (cookies en :3000). Puede fallar en cross-origin sin SSO. */
export async function fetchTpvSession(): Promise<TpvSessionResponse> {
  const base = getTpvAppBaseUrl()
  try {
    const res = await fetch(`${base}/api/me/session`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { user: null, error: `HTTP_${res.status}` }
    }
    return (await res.json()) as TpvSessionResponse
  } catch {
    return { user: null, error: 'NETWORK' }
  }
}
