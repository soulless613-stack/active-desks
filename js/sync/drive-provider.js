/**
 * @file drive-provider.js
 * @description Google Drive AppData REST API sync provider for Active Desks v2.0.
 * Operates strictly within 'https://www.googleapis.com/auth/drive.appdata' scope.
 * Zero access to personal documents, photos, or files. Zero backend hosting cost.
 */

import * as db from '../db.js';
import { state, emit } from '../state.js';

const STATE_FILE_NAME = 'active-desks-v2-state.json';
let accessToken = null;
let tokenClient = null;
let connectedUserEmail = null;
let authRetryCount = 0;
const MAX_AUTH_RETRIES = 3;
let onAuthExpiredCallback = null;

/**
 * Registers a callback invoked when 401 re-authorization fails 3 times.
 * @param {Function} cb
 */
export function setOnAuthExpiredCallback(cb) {
  onAuthExpiredCallback = cb;
}

/**
 * Restores a cached OAuth session from localStorage if still valid,
 * or triggers silent background refresh if expired.
 * 
 * @outputs {boolean} True if active valid token was restored immediately.
 */
export function restoreDriveSession() {
  try {
    const cachedToken = localStorage.getItem('active_desks_drive_token');
    const expiresAt = parseInt(localStorage.getItem('active_desks_drive_token_expires') || '0', 10);
    const cachedEmail = localStorage.getItem('active_desks_drive_email');

    // Buffer 60 seconds before expiration
    if (cachedToken && Date.now() < (expiresAt - 60000)) {
      accessToken = cachedToken;
      connectedUserEmail = cachedEmail || 'Google Account';
      authRetryCount = 0;
      return true;
    } else if (tokenClient && cachedToken) {
      // Trigger silent background refresh
      tokenClient.requestAccessToken({ prompt: '' });
    }
  } catch (e) {
    console.warn('Could not restore cached Drive session:', e);
  }
  return false;
}

/**
 * Handles HTTP 401 responses on Drive REST calls with a 3-try limit.
 * @returns {Promise<boolean>} True if retry should be attempted.
 */
async function handle401Unauthorized() {
  authRetryCount++;
  console.warn(`Drive REST returned 401 Unauthorized (attempt ${authRetryCount}/${MAX_AUTH_RETRIES})`);

  accessToken = null;
  localStorage.removeItem('active_desks_drive_token');
  localStorage.removeItem('active_desks_drive_token_expires');

  if (authRetryCount <= MAX_AUTH_RETRIES && tokenClient) {
    return new Promise((resolve) => {
      try {
        tokenClient.requestAccessToken({ prompt: '' });
        setTimeout(() => {
          resolve(!!accessToken);
        }, 1200);
      } catch (err) {
        resolve(false);
      }
    });
  } else {
    console.warn('Exceeded 3 401 unauthorized retries. Switching status to amber.');
    if (onAuthExpiredCallback) onAuthExpiredCallback();
    return false;
  }
}

/**
 * Initializes the Google Identity Services token client.
 * 
 * @purpose Prepares the OAuth 2.0 GIS client instance with restricted AppData scope.
 * @inputs {string} clientId - Google OAuth 2.0 Web Client ID.
 * @inputs {Function} onTokenCallback - Callback invoked when a token is issued or fails.
 * @outputs {boolean} True if GIS SDK is loaded and initialized, false otherwise.
 */
export function initDriveTokenClient(clientId, onTokenCallback) {
  if (!window.google?.accounts?.oauth2) {
    console.warn('Google Identity Services SDK not loaded yet.');
    return false;
  }

  if (!clientId || !clientId.trim()) {
    console.warn('Cannot initialize Google Drive client without a valid Client ID.');
    return false;
  }

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId.trim(),
    scope: 'https://www.googleapis.com/auth/drive.appdata email',
    callback: async (tokenResponse) => {
      if (tokenResponse.error) {
        console.error('Google OAuth Token Error:', tokenResponse);
        if (onTokenCallback) onTokenCallback({ error: tokenResponse.error });
        return;
      }

      accessToken = tokenResponse.access_token;
      authRetryCount = 0; // Reset retry counter on successful token receipt

      // Retrieve user email to display connection status
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (userInfoRes.ok) {
          const info = await userInfoRes.json();
          connectedUserEmail = info.email || 'Google Account';
        }
      } catch (e) {
        connectedUserEmail = 'Google Account';
      }

      // Persist to localStorage for mobile PWA session persistence
      try {
        const expiresInSec = tokenResponse.expires_in || 3600;
        localStorage.setItem('active_desks_drive_token', accessToken);
        localStorage.setItem('active_desks_drive_token_expires', String(Date.now() + expiresInSec * 1000));
        localStorage.setItem('active_desks_drive_email', connectedUserEmail || 'Google Account');
      } catch (e) {
        console.warn('Could not cache token in localStorage:', e);
      }

      if (onTokenCallback) {
        onTokenCallback({
          token: accessToken,
          email: connectedUserEmail,
          expiresIn: tokenResponse.expires_in
        });
      }
    }
  });

  return true;
}

/**
 * Triggers the Google Sign-In / OAuth consent prompt.
 * 
 * @purpose Requests a fresh bearer token for Drive AppData access.
 * @inputs None.
 * @outputs {void}
 */
export function requestDriveAuth() {
  if (!tokenClient) {
    throw new Error('Google Drive Client ID is not initialized. Please save your Client ID in Settings.');
  }
  tokenClient.requestAccessToken({ prompt: '' });
}

/**
 * Returns the email of the connected Google account.
 * 
 * @outputs {string | null}
 */
export function getDriveUserEmail() {
  return connectedUserEmail;
}

/**
 * Sets the active Google OAuth access token.
 * 
 * @purpose Stores the in-memory bearer token for Drive REST requests.
 * @inputs {string} token - Valid OAuth access token.
 */
export function setDriveAccessToken(token) {
  accessToken = token;
}

/**
 * Checks if the Drive provider has an active bearer token.
 * 
 * @outputs {boolean}
 */
export function isDriveConnected() {
  return !!accessToken;
}

/**
 * Searches the user's hidden AppData folder for the existing state file.
 * 
 * @outputs {Promise<string | null>} File ID if found, or null.
 */
async function findAppDataFileId() {
  if (!accessToken) return null;

  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${STATE_FILE_NAME}' and trashed=false&fields=files(id, name, modifiedTime)`;
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.status === 401) {
    const recovered = await handle401Unauthorized();
    if (recovered && accessToken) {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    }
  }

  if (!res.ok) return null;
  const data = await res.json();
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

/**
 * Uploads a state payload to the user's hidden Google Drive AppData folder.
 * 
 * @purpose Persists serialized database snapshot to private cloud storage.
 * @inputs {object} payload - Serialized Active Desks state object.
 * @outputs {Promise<{ status: string, fileId: string }>}
 */
export async function uploadToDrive(payload) {
  if (!accessToken) {
    restoreDriveSession();
  }
  if (!accessToken) {
    throw new Error('Google Drive is not connected (no access token)');
  }

  const fileId = await findAppDataFileId();
  const fileContent = JSON.stringify(payload, null, 2);

  if (fileId) {
    // Update existing file (PATCH)
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    let res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: fileContent
    });

    if (res.status === 401) {
      const recovered = await handle401Unauthorized();
      if (recovered && accessToken) {
        res = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: fileContent
        });
      }
    }

    if (!res.ok) throw new Error(`Drive update failed: HTTP ${res.status}`);
    return { status: 'updated', fileId };
  } else {
    // Create new file in appDataFolder (POST multipart)
    const metadata = {
      name: STATE_FILE_NAME,
      parents: ['appDataFolder']
    };

    const boundary = '-------ActiveDesksBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (res.status === 401) {
      const recovered = await handle401Unauthorized();
      if (recovered && accessToken) {
        res = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
      }
    }

    if (!res.ok) throw new Error(`Drive create failed: HTTP ${res.status}`);
    const data = await res.json();
    return { status: 'created', fileId: data.id };
  }
}

/**
 * Downloads and parses the remote state payload from Google Drive.
 * 
 * @purpose Fetches latest remote changes during sync reconciliation.
 * @outputs {Promise<object | null>} Remote state snapshot or null if no file exists.
 */
export async function fetchFromDrive() {
  if (!accessToken) {
    restoreDriveSession();
  }
  if (!accessToken) return null;

  const fileId = await findAppDataFileId();
  if (!fileId) return null;

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  let res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (res.status === 401) {
    const recovered = await handle401Unauthorized();
    if (recovered && accessToken) {
      res = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    }
  }

  if (!res.ok) return null;
  return await res.json();
}

/**
 * Performs full bidirectional reconciliation with Google Drive AppData.
 * 
 * @purpose Merges remote captures/desks into local IndexedDB and uploads local updates to Drive.
 * @outputs {Promise<{ action: 'pulled' | 'pushed' | 'merged' | 'synced', details: string }>}
 */
export async function syncWithDrive() {
  if (!accessToken) {
    throw new Error('Google Drive is not authenticated');
  }

  const remoteData = await fetchFromDrive();
  const [localDesks, localAnchors, localCaptures] = await Promise.all([
    db.getAll('desks'),
    db.getAll('anchors'),
    db.getAll('captures')
  ]);

  // If no remote file exists yet, push full local state to Drive
  if (!remoteData || !remoteData.stores) {
    const initialPayload = {
      version: '2.0',
      syncedAt: new Date().toISOString(),
      stores: {
        desks: localDesks,
        anchors: localAnchors,
        captures: localCaptures
      }
    };
    await uploadToDrive(initialPayload);
    return { action: 'pushed', details: `Uploaded ${localCaptures.length} captures to private Google Drive.` };
  }

  // Remote file exists: merge captures
  const remoteCaptures = Array.isArray(remoteData.stores.captures) ? remoteData.stores.captures : [];
  const localCapturesMap = new Map(localCaptures.map(c => [c.id, c]));
  let pulledCapturesCount = 0;
  let hasLocalCapturesToPush = false;

  for (const rCap of remoteCaptures) {
    const localMatch = localCapturesMap.get(rCap.id);
    if (!localMatch) {
      await db.put('captures', rCap);
      pulledCapturesCount++;
    } else {
      const rTime = new Date(rCap.updatedAt || rCap.createdAt || 0).getTime();
      const lTime = new Date(localMatch.updatedAt || localMatch.createdAt || 0).getTime();
      if (rTime > lTime) {
        await db.put('captures', rCap);
        pulledCapturesCount++;
      }
    }
  }

  const remoteCapturesMap = new Map(remoteCaptures.map(c => [c.id, c]));
  for (const lCap of localCaptures) {
    if (!remoteCapturesMap.has(lCap.id)) {
      hasLocalCapturesToPush = true;
    }
  }

  // Merge desks
  const remoteDesks = Array.isArray(remoteData.stores.desks) ? remoteData.stores.desks : [];
  let pulledDesksCount = 0;
  let hasLocalDesksToPush = false;
  const localDesksMap = new Map(localDesks.map(d => [d.id, d]));

  for (const rDesk of remoteDesks) {
    const lDesk = localDesksMap.get(rDesk.id);
    if (!lDesk) {
      await db.put('desks', rDesk);
      state.desks[rDesk.id] = rDesk;
      pulledDesksCount++;
    } else {
      const rTime = new Date(rDesk.lastUpdated || 0).getTime();
      const lTime = new Date(lDesk.lastUpdated || 0).getTime();
      if (rTime > lTime) {
        await db.put('desks', rDesk);
        state.desks[rDesk.id] = rDesk;
        pulledDesksCount++;
      }
    }
  }

  for (const lDesk of localDesks) {
    const rMatch = remoteDesks.find(d => d.id === lDesk.id);
    if (!rMatch) {
      hasLocalDesksToPush = true;
    } else {
      const lTime = new Date(lDesk.lastUpdated || 0).getTime();
      const rTime = new Date(rMatch.lastUpdated || 0).getTime();
      if (lTime > rTime) hasLocalDesksToPush = true;
    }
  }

  if (pulledDesksCount > 0) {
    emit('desks');
    emit('activeDeskIds');
  }

  // If local updates existed or we pulled changes, save consolidated snapshot to Drive
  if (hasLocalCapturesToPush || hasLocalDesksToPush || pulledCapturesCount > 0 || pulledDesksCount > 0) {
    const [finalDesks, finalAnchors, finalCaptures] = await Promise.all([
      db.getAll('desks'),
      db.getAll('anchors'),
      db.getAll('captures')
    ]);

    const consolidatedPayload = {
      version: '2.0',
      syncedAt: new Date().toISOString(),
      stores: {
        desks: finalDesks,
        anchors: finalAnchors,
        captures: finalCaptures
      }
    };
    await uploadToDrive(consolidatedPayload);

    return {
      action: pulledCapturesCount > 0 ? 'merged' : 'pushed',
      details: `Synced (${pulledCapturesCount} captures pulled, consolidated snapshot updated).`
    };
  }

  return { action: 'synced', details: 'Local database and Google Drive are fully in sync.' };
}
