/**
 * @file db.js
 * @description Asynchronous Promise-based IndexedDB engine for Active Desks v2.0.
 * Zero external dependencies. Handles store creation, version migration, and indexed queries.
 */

const DB_NAME = 'active_desks_v2_db';
const DB_VERSION = 1;

/** @type {IDBDatabase | null} Cached database singleton instance */
let dbInstance = null;

/**
 * Opens or retrieves the cached singleton connection to the IndexedDB database.
 * 
 * @purpose Initializes the database connection and builds schema object stores on first run or version upgrades.
 * @inputs None. Relies on internal DB_NAME and DB_VERSION constants.
 * @outputs {Promise<IDBDatabase>} Resolves with the active IDBDatabase connection instance.
 * @sideEffects Creates object stores ('captures', 'desks', 'anchors', 'settings') and secondary indexes on disk.
 */
export function openDB() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;

      // 1. Captures Store: Universal 3-Tier Document Envelope
      if (!db.objectStoreNames.contains('captures')) {
        const capturesStore = db.createObjectStore('captures', { keyPath: 'id' });
        capturesStore.createIndex('by_domain', 'domain', { unique: false });
        capturesStore.createIndex('by_status', 'status', { unique: false });
        capturesStore.createIndex('by_createdAt', 'createdAt', { unique: false });
        capturesStore.createIndex('by_domain_topic', ['domain', 'topic'], { unique: false });
      }

      // 2. Desks Store: Workbenches state & active selection
      if (!db.objectStoreNames.contains('desks')) {
        db.createObjectStore('desks', { keyPath: 'id' });
      }

      // 3. Anchors Store: Daily 3 Rhythm tracking (keyed by date string YYYY-MM-DD)
      if (!db.objectStoreNames.contains('anchors')) {
        db.createObjectStore('anchors', { keyPath: 'date' });
      }

      // 4. Settings Store: Device configuration & local secrets
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Reset cached instance if closed unexpectedly by the browser
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB [${DB_NAME}]: ${request.error?.message}`));
    };
  });
}

/**
 * Retrieves a single record by primary key.
 * 
 * @purpose Fetches an item from the specified store using its primary key.
 * @inputs {string} storeName - Target object store name.
 * @inputs {IDBValidKey} key - Primary key of the record.
 * @outputs {Promise<any | undefined>} Resolves with the found record or undefined if not found.
 * @sideEffects Opens a read-only transaction on the target store.
 */
export async function get(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Error reading from [${storeName}]: ${request.error?.message}`));
  });
}

/**
 * Retrieves all records from an object store, optionally filtered by an index and query range.
 * 
 * @purpose Allows bulk querying or indexed range scans across stores.
 * @inputs {string} storeName - Target object store name.
 * @inputs {string} [indexName] - Optional name of the index to scan instead of the primary key.
 * @inputs {IDBKeyRange | IDBValidKey} [queryRange] - Optional query key or range filter.
 * @outputs {Promise<Array<any>>} Resolves with an array of matching records.
 * @sideEffects Opens a read-only transaction on the target store.
 */
export async function getAll(storeName, indexName = null, queryRange = null) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const target = indexName ? store.index(indexName) : store;
    const request = queryRange ? target.getAll(queryRange) : target.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(new Error(`Error fetching all from [${storeName}]: ${request.error?.message}`));
  });
}

/**
 * Inserts or updates a single record.
 * 
 * @purpose Writes a value to an object store using its keyPath.
 * @inputs {string} storeName - Target object store name.
 * @inputs {any} value - Record to save. Must include the store's keyPath.
 * @outputs {Promise<IDBValidKey>} Resolves with the written key.
 * @sideEffects Opens a readwrite transaction, mutating persistent storage.
 */
export async function put(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Error writing to [${storeName}]: ${request.error?.message}`));
  });
}

/**
 * Inserts or updates an array of records within a single atomic transaction.
 * 
 * @purpose High-performance bulk persistence, ensuring all items succeed or roll back together.
 * @inputs {string} storeName - Target object store name.
 * @inputs {Array<any>} values - Array of records to save.
 * @outputs {Promise<number>} Resolves with the count of successfully persisted records.
 * @sideEffects Opens a single readwrite transaction and mutates persistent storage.
 */
export async function bulkPut(storeName, values) {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    for (const item of values) {
      store.put(item);
    }

    tx.oncomplete = () => resolve(values.length);
    tx.onerror = () => reject(new Error(`Bulk write failed on [${storeName}]: ${tx.error?.message}`));
    tx.onabort = () => reject(new Error(`Bulk write aborted on [${storeName}]: ${tx.error?.message}`));
  });
}

/**
 * Deletes a single record by primary key.
 * 
 * @purpose Removes an item from the specified store.
 * @inputs {string} storeName - Target object store name.
 * @inputs {IDBValidKey} key - Primary key of the record to remove.
 * @outputs {Promise<void>} Resolves when the deletion is confirmed.
 * @sideEffects Opens a readwrite transaction, permanently removing the record from disk.
 */
export async function remove(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Error deleting from [${storeName}]: ${request.error?.message}`));
  });
}

/**
 * Clears all records from an object store.
 * 
 * @purpose Empties a store during tests, database reset, or fresh imports.
 * @inputs {string} storeName - Target object store name.
 * @outputs {Promise<void>} Resolves when the store is empty.
 * @sideEffects Removes all records from the target store on disk.
 */
export async function clear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error(`Error clearing store [${storeName}]: ${request.error?.message}`));
  });
}

/**
 * Closes the active database connection and resets the singleton cache.
 * 
 * @purpose Clean shutdown for testing environments or database recreation.
 * @inputs None.
 * @outputs {void}
 * @sideEffects Closes connection handle if open.
 */
export function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
