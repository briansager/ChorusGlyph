import type { ReadingOverride, ReadingOverrideStore } from './reading-override'

const DATABASE_NAME = 'chorus-glyph'
const STORE_NAME = 'reading-overrides'
const ROMANIZATION_STORE_NAME = 'romanizations'
const SCHEMA_VERSION = 2
const OPERATION_TIMEOUT_MS = 1500

export class IndexedDbReadingOverrideStore implements ReadingOverrideStore {
  private databasePromise: Promise<IDBDatabase | undefined> | undefined

  async get(key: string): Promise<ReadingOverride | undefined> {
    try {
      const database = await this.openDatabase()
      if (!database) return undefined

      return await this.withTimeout(
        new Promise((resolve, reject) => {
          const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
          request.onsuccess = () => resolve(request.result as ReadingOverride | undefined)
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      return undefined
    }
  }

  async set(key: string, override: ReadingOverride): Promise<void> {
    try {
      const database = await this.openDatabase()
      if (!database) return

      await this.withTimeout(
        new Promise<void>((resolve, reject) => {
          const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(override, key)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      // Override persistence is optional when IndexedDB is unavailable.
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const database = await this.openDatabase()
      if (!database) return

      await this.withTimeout(
        new Promise<void>((resolve, reject) => {
          const request = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(key)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
      )
    } catch {
      // Override persistence is optional when IndexedDB is unavailable.
    }
  }

  private async openDatabase(): Promise<IDBDatabase | undefined> {
    if (this.databasePromise) return this.databasePromise
    if (typeof indexedDB === 'undefined') return undefined

    this.databasePromise = this.withTimeout(
      new Promise<IDBDatabase | undefined>((resolve) => {
        let request: IDBOpenDBRequest
        try {
          request = indexedDB.open(DATABASE_NAME, SCHEMA_VERSION)
        } catch {
          resolve(undefined)
          return
        }

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(ROMANIZATION_STORE_NAME)) {
            request.result.createObjectStore(ROMANIZATION_STORE_NAME)
          }
          if (!request.result.objectStoreNames.contains(STORE_NAME)) {
            request.result.createObjectStore(STORE_NAME)
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
