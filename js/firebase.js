/**
 * @file firebase.js
 * @description Cloud Firestore database client for Active Desks v3.0.
 * Configured with persistent multi-tab local caching for automatic offline
 * IndexedDB persistence and zero-latency real-time synchronization.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

/**
 * Active Desks v3.0 Firebase Web Client Configuration
 */
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCEZkpK58N93cpExYcycGPW1sOyUNM2OAg",
  authDomain: "active-desks-v3.firebaseapp.com",
  projectId: "active-desks-v3",
  storageBucket: "active-desks-v3.firebasestorage.app",
  messagingSenderId: "947262879848",
  appId: "1:947262879848:web:0d351c547fa43669c7e3dd"
};

let app = null;
let db = null;
let isInitialized = false;

/**
 * Initializes the Firebase Application and Firestore with multi-tab offline caching.
 * 
 * @purpose Boots the cloud database connection and mounts IndexedDB local cache.
 * @inputs None. Relies on internal or localStorage configured keys.
 * @outputs {Promise<{ app: object, db: object }>} Active Firebase instances.
 * @sideEffects Connects to Google Cloud Firestore WebSockets and creates browser cache.
 */
export async function initFirebase() {
  if (isInitialized) return { app, db };

  try {
    let customConfig = null;
    try {
      const stored = localStorage.getItem('active_desks_firebase_config');
      if (stored) customConfig = JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read stored Firebase config:', e);
    }

    const config = customConfig || DEFAULT_FIREBASE_CONFIG;
    app = initializeApp(config);

    // Initialize Firestore with offline persistence (IndexedDB backed multi-tab)
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });

    isInitialized = true;
    return { app, db };
  } catch (err) {
    console.error('Failed to initialize Firestore with persistent cache:', err);
    throw err;
  }
}

/**
 * Subscribes to real-time updates for an entire Firestore collection.
 * 
 * @purpose Pushes live changes from cloud/offline cache to subscribers.
 * @inputs {string} colName - Name of the collection ('captures', 'desks', 'anchors').
 * @inputs {Function} onUpdate - Callback receiving array of { id, ...data }.
 * @inputs {Function} [onError] - Optional error handler.
 * @outputs {Function} Unsubscribe teardown handle.
 */
export function onCollection(colName, onUpdate, onError) {
  if (!db) {
    console.warn(`Firestore not initialized before listening to [${colName}]`);
    return () => {};
  }

  const colRef = collection(db, colName);
  return onSnapshot(colRef, (snapshot) => {
    const records = [];
    snapshot.forEach(docSnap => {
      records.push({ id: docSnap.id, ...docSnap.data() });
    });
    onUpdate(records);
  }, (err) => {
    console.error(`Error in Firestore collection listener [${colName}]:`, err);
    if (onError) onError(err);
  });
}

/**
 * Subscribes to real-time updates for a single document.
 * 
 * @purpose Watches a single document for changes (e.g. today's anchors).
 * @inputs {string} colName - Collection name.
 * @inputs {string} docId - Target document identifier.
 * @inputs {Function} onUpdate - Callback receiving document data or null.
 * @outputs {Function} Unsubscribe teardown handle.
 */
export function onDoc(colName, docId, onUpdate) {
  if (!db) return () => {};

  const docRef = doc(db, colName, String(docId));
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      onUpdate({ id: docSnap.id, ...docSnap.data() });
    } else {
      onUpdate(null);
    }
  }, (err) => {
    console.error(`Error in Firestore doc listener [${colName}/${docId}]:`, err);
  });
}

/**
 * Saves or updates a document in Firestore.
 * 
 * @purpose Atomic creation or patch in local cache and remote database.
 * @inputs {string} colName - Target collection.
 * @inputs {string} docId - Document key identifier.
 * @inputs {object} data - Payload to write.
 * @outputs {Promise<void>}
 */
export async function saveDoc(colName, docId, data) {
  if (!db) await initFirebase();
  const docRef = doc(db, colName, String(docId));
  const payload = {
    ...data,
    updatedAt: new Date().toISOString()
  };
  await setDoc(docRef, payload, { merge: true });
}

/**
 * Atomically deletes a document by ID.
 * 
 * @purpose Permanently removes the record from both offline IndexedDB and cloud database.
 * @inputs {string} colName - Collection name.
 * @inputs {string} docId - Document identifier to delete.
 * @outputs {Promise<void>}
 */
export async function deleteDocById(colName, docId) {
  if (!db) await initFirebase();
  const docRef = doc(db, colName, String(docId));
  await deleteDoc(docRef);
}

/**
 * Fetches all documents currently in a collection (from cache or server).
 * 
 * @purpose One-time retrieval of a collection snapshot.
 * @inputs {string} colName - Collection name.
 * @outputs {Promise<Array<object>>} List of documents with id field.
 */
export async function getCollection(colName) {
  if (!db) await initFirebase();
  const colRef = collection(db, colName);
  const snap = await getDocs(colRef);
  const records = [];
  snap.forEach(d => records.push({ id: d.id, ...d.data() }));
  return records;
}
