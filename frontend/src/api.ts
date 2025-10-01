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

const isBrowser = typeof window !== 'undefined'

const cachedGetResponses = new Map<string, unknown>()
const CACHE_STORAGE_PREFIX = 'apiCache:'

function getSessionStorage(): Storage | null {
  if (!isBrowser) return null
  try {
    return window.sessionStorage
  } catch (_error) {
    return null
  }
}

function getLocalStorage(): Storage | null {
  if (!isBrowser) return null
  try {
    return window.localStorage
  } catch (_error) {
    return null
  }
}

function getCacheStorages(): Storage[] {
  const storages: Storage[] = []
  const session = getSessionStorage()
  const local = getLocalStorage()

  if (session) storages.push(session)
  if (local) storages.push(local)

  return storages
}

function safeGetItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch (_error) {
    return null
  }
}

function safeSetItem(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value)
  } catch (_error) {
    // Ignore write errors (e.g. quota exceeded)
  }
}

function safeRemoveItem(storage: Storage, key: string) {
  try {
    storage.removeItem(key)
  } catch (_error) {
    // Ignore removal errors (e.g. storage unavailable)
  }
}

function getCacheKey(config?: AxiosRequestConfig) {
  if (!config?.url) return null

  const method = (config.method ?? 'get').toLowerCase()
  if (method !== 'get') return null

  const params = config.params ? JSON.stringify(config.params) : ''
  return `${config.url}?${params}`
}

function readCachedGetResponse(cacheKey: string): unknown | undefined {
  if (cachedGetResponses.has(cacheKey)) {
    return cachedGetResponses.get(cacheKey)
  }

  if (!isBrowser) return undefined

  const storageKey = `${CACHE_STORAGE_PREFIX}${cacheKey}`
  const storages = getCacheStorages()
  const sessionStorageInstance = getSessionStorage()

  for (const storage of storages) {
    const stored = safeGetItem(storage, storageKey)
    if (!stored) continue

    try {
      const parsed = JSON.parse(stored)
      cachedGetResponses.set(cacheKey, parsed)

      // Ensure the value is duplicated in faster storages for subsequent reads.
      if (sessionStorageInstance && storage !== sessionStorageInstance) {
        safeSetItem(sessionStorageInstance, storageKey, stored)
      }

      return parsed
    } catch (_error) {
      safeRemoveItem(storage, storageKey)
    }
  }

  return undefined
}

function writeCachedGetResponse(cacheKey: string, data: unknown) {
  cachedGetResponses.set(cacheKey, data)

  if (!isBrowser) return

  const storageKey = `${CACHE_STORAGE_PREFIX}${cacheKey}`

  let payload: string
  try {
    payload = JSON.stringify(data)
  } catch (_error) {
    return
  }

  for (const storage of getCacheStorages()) {
    safeSetItem(storage, storageKey, payload)
  }
}

function clearCachedGetResponses() {
  cachedGetResponses.clear()

  if (!isBrowser) return

  for (const storage of getCacheStorages()) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index)
      if (key?.startsWith(CACHE_STORAGE_PREFIX)) {
        safeRemoveItem(storage, key)
      }
    }
  }
}

function isEmptyResponseData(data: unknown) {
  if (data === undefined || data === null) return true
  if (typeof data === 'string') return data.trim().length === 0
  return false
}

api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase()
  if (method === 'get') {
    const headers = (config.headers ?? {}) as Record<string, string>
    headers['Cache-Control'] = 'no-cache'
    headers.Pragma = 'no-cache'
    headers['If-Modified-Since'] = '0'
    config.headers = headers
  }
  return config
})

let currentTokens: AuthTokens | null = null
let refreshPromise: Promise<AuthTokens | null> | null = null

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
  clearCachedGetResponses()
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
  (response) => {
    const cacheKey = getCacheKey(response.config)

    if (cacheKey) {
      const cachedData = readCachedGetResponse(cacheKey)

      if (response.status === 304) {
        if (cachedData !== undefined) {
          response.data = cachedData
        }
      } else if (response.status >= 200 && response.status < 300) {
        if (isEmptyResponseData(response.data)) {
          if (cachedData !== undefined) {
            response.data = cachedData
          }
        } else {
          writeCachedGetResponse(cacheKey, response.data)
        }
      }
    }

    return response
  },
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