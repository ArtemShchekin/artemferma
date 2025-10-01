import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export const AUTH_TOKENS_EVENT = 'auth:tokens'
export const AUTH_LOGOUT_EVENT = 'auth:logout'
const AUTH_STORAGE_KEY = 'authTokens'

interface RetryableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
  skipAuthRefresh?: boolean
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304
})

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (method === 'get') {
    const headers = (config.headers ?? {}) as Record<string, string>
    headers['Cache-Control'] = 'no-cache'
    headers.Pragma = 'no-cache'
    headers['If-Modified-Since'] = '0'
    config.headers = headers
  }
  return config})

let currentTokens: AuthTokens | null = null
let refreshPromise: Promise<AuthTokens | null> | null = null
const isBrowser = typeof window !== 'undefined'

function setAuthHeader(token: string | null) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  else delete api.defaults.headers.common['Authorization']
}

function parseTokens(raw: string | null): AuthTokens | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed?.accessToken === 'string' && typeof parsed?.refreshToken === 'string') {
      return { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken }
    }
  } catch (_error) {}
  return null
}

export function initializeAuthTokens(): AuthTokens | null {
  if (!isBrowser) {
    currentTokens = null
    return null
  }
  const stored = parseTokens(window.localStorage.getItem(AUTH_STORAGE_KEY))
  if (window.localStorage.getItem('token')) {
    window.localStorage.removeItem('token')
  }
  currentTokens = stored
  setAuthHeader(stored?.accessToken ?? null)
  if (stored) {
    return { ...stored }
  }
  return null
}

function emitTokens(tokens: AuthTokens | null) {
  if (!isBrowser) return
  window.dispatchEvent(new CustomEvent<AuthTokens | null>(AUTH_TOKENS_EVENT, { detail: tokens }))
}

export function applyAuthTokens(tokens: AuthTokens) {
  currentTokens = tokens
  if (isBrowser) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens))
  }
  setAuthHeader(tokens.accessToken)
  emitTokens(tokens)
}

export function clearAuthTokens({ emitEvent = true }: { emitEvent?: boolean } = {}) {
  currentTokens = null
  if (isBrowser) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }
  setAuthHeader(null)
  if (emitEvent) {
    emitTokens(null)
  }
}

export function forceLogout() {
  clearAuthTokens({ emitEvent: true })
  if (isBrowser) {
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
  }
}

export function getCurrentTokens(): AuthTokens | null {
  if (currentTokens) {
    return { ...currentTokens }
  }
  const stored = initializeAuthTokens()
  return stored ? { ...stored } : null
}

async function refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const response = await api.post<AuthTokens>(
      '/auth/refresh',
      { refreshToken },
      { skipAuthRefresh: true }
    )
    const tokens = response.data
    if (tokens?.accessToken && tokens?.refreshToken) {
      return tokens
    }
    return null
  } catch (_error) {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const response = error.response
    const originalRequest = error.config as RetryableRequestConfig | undefined

    if (!response || !originalRequest) {
      return Promise.reject(error)
    }

    if (originalRequest.skipAuthRefresh || response.status !== 401) {
      if (response.status === 401 && !originalRequest.skipAuthRefresh) {
        forceLogout()
      }
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      forceLogout()
      return Promise.reject(error)
    }

    if (typeof originalRequest.url === 'string' && originalRequest.url.startsWith('/auth/')) {
      return Promise.reject(error)
    }

    const tokens = getCurrentTokens()
    const refreshToken = tokens?.refreshToken
    if (!refreshToken) {
      forceLogout()
      return Promise.reject(error)
    }

    if (!refreshPromise) {
      refreshPromise = refreshTokens(refreshToken)
    }

    const newTokens = await refreshPromise
    refreshPromise = null

    if (!newTokens) {
      forceLogout()
      return Promise.reject(error)
    }

    applyAuthTokens(newTokens)

    originalRequest._retry = true
    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers['Authorization'] = `Bearer ${newTokens.accessToken}`

    return api(originalRequest)
  }
)

export { api }