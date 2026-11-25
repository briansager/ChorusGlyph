const TOKEN_KEY = 'chorusglyph.windows-companion.token'

export interface CompanionTokenStorage {
  get(): string | undefined
  set(token: string): void
  clear(): void
}

export function createBrowserCompanionTokenStorage(): CompanionTokenStorage {
  return {
    get: () => {
      try {
        return window.localStorage.getItem(TOKEN_KEY) ?? undefined
      } catch {
        return undefined
      }
    },
    set: (token) => {
      try {
        window.localStorage.setItem(TOKEN_KEY, token)
      } catch {
        // Local persistence is optional; the companion still works for this session.
      }
    },
    clear: () => {
      try {
        window.localStorage.removeItem(TOKEN_KEY)
      } catch {
        // Local persistence is optional.
      }
    },
  }
}
