import type { RomanizationCache, RomanizationCacheEntry } from './romanization-cache'

const DEFAULT_DATABASE_NAME = 'chorus-glyph'
const DEFAULT_STORE_NAME = 'romanizations'
const DEFAULT_SCHEMA_VERSION = 2
const OPERATION_TIMEOUT_MS = 1500

export class IndexedDbRomanizationCache implements RomanizationCache {
  private readonly databaseName: string
  private readonly storeName: string
  private readonly schemaVersion: number
  private databasePromise: Promise<IDBDatabase | undefined> | undefined

  constructor(
    databaseName = DEFAULT_DATABASE_NAME,
    storeName = DEFAULT_STORE_NAME,
    schemaVersion = DEFAULT_SCHEMA_VERSION,
  ) {
    this.databaseName = databaseName
    this.storeName = storeName
    this.schemaVersion = schemaVersion
  }

  async get(key: string): Promise<RomanizationCacheEntry | undefined> {
    try {
      const database = await this.openDatabase()
      if (!database) return undefined

      return await this.withTimeout(
        new Promise((resolve, reject) => {
          const request = database.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(key)
          request.onsuccess = () => resolve(request.result as RomanizationCacheEntry | undefined)
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      return undefined
    }
  }

  async set(key: string, entry: RomanizationCacheEntry): Promise<void> {
    try {
      const database = await this.openDatabase()
      if (!database) return

      await this.withTimeout(
        new Promise<void>((resolve, reject) => {
          const request = database.transaction(this.storeName, 'readwrite').objectStore(this.storeName).put(entry, key)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      // Cache failures must not block local romanization.
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const database = await this.openDatabase()
      if (!database) return

      await this.withTimeout(
        new Promise<void>((resolve, reject) => {
          const request = database.transaction(this.storeName, 'readwrite').objectStore(this.storeName).delete(key)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      // Cache failures must not block local romanization.
    }
  }

  async clear(): Promise<void> {
    try {
      const database = await this.openDatabase()
      if (!database) return

      await this.withTimeout(
        new Promise<void>((resolve, reject) => {
          const request = database.transaction(this.storeName, 'readwrite').objectStore(this.storeName).clear()
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      // Cache failures must not block local romanization.
    }
  }

  private async openDatabase(): Promise<IDBDatabase | undefined> {
    if (this.databasePromise) return this.databasePromise

    if (typeof indexedDB === 'undefined') return undefined

    this.databasePromise = this.withTimeout(
      new Promise<IDBDatabase | undefined>((resolve) => {
        let request: IDBOpenDBRequest
        try {
          request = indexedDB.open(this.databaseName, this.schemaVersion)
        } catch {
          resolve(undefined)
          return
        }

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(this.storeName)) {
            request.result.createObjectStore(this.storeName)
          }
          if (!request.result.objectStoreNames.contains('reading-overrides')) {
            request.result.createObjectStore('reading-overrides')
          }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(undefined)
        request.onblocked = () => resolve(undefined)
      }),
    ).catch(() => undefined)

    return this.databasePromise
  }

  private withTimeout<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('IndexedDB operation timed out.')), OPERATION_TIMEOUT_MS)
      operation.then(
        (value) => {
          clearTimeout(timeout)
          resolve(value)
        },
        (error) => {
          clearTimeout(timeout)
          reject(error)
        },
      )
    })
  }
}
