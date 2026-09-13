const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export class ApiError extends Error {
  status: number
  details?: Record<string, unknown>
  constructor(message:string, status:number, details?:Record<string,unknown>) { super(message); this.status=status; this.details=details }
}

const parse = async (response:Response) => {
  if (response.status === 204 || response.headers.get('content-length') === '0') return null
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return text }
}

let refreshPromise: Promise<boolean> | null = null
async function refreshAccessToken() {
  const token = localStorage.getItem('roomly.refreshToken')
  if (!token) return false
  if (!refreshPromise) refreshPromise = fetch(`${API_URL}/auth/refresh-access-token`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refreshToken:token})
  }).then(async r => {
    if (!r.ok) return false
    const data = await parse(r)
    localStorage.setItem('roomly.accessToken', data.accessToken)
    if (data.refreshToken) localStorage.setItem('roomly.refreshToken', data.refreshToken)
    return true
  }).finally(() => { refreshPromise = null })
  return refreshPromise
}

export async function api<T=unknown>(path:string, options:RequestInit = {}, retry=true):Promise<T> {
  const token = localStorage.getItem('roomly.accessToken')
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type','application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`, {...options, headers})
  if (response.status === 401 && retry && await refreshAccessToken()) return api<T>(path, options, false)
  const data = await parse(response)
  if (!response.ok) {
    const body = typeof data === 'object' && data ? data as Record<string,unknown> : undefined
    throw new ApiError(String(body?.detail || body?.title || data || `Lỗi ${response.status}`), response.status, body)
  }
  return data as T
}

export const body = (value:unknown):RequestInit => ({ body:JSON.stringify(value) })

