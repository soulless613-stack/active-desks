/**
 * @file drive-provider.js
 * @description Google Drive AppData REST API sync provider for Active Desks v2.0.
 * Operates strictly within 'https://www.googleapis.com/auth/drive.appdata' scope.
 * Zero access to personal documents, photos, or files. Zero backend hosting cost.
 */

import * as db from '../db.js';

const STATE_FILE_NAME = 'active-desks-v2-state.json';
let accessToken = null;

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
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

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
    throw new Error('Google Drive is not connected (no access token)');
  }

  const fileId = await findAppDataFileId();
  const fileContent = JSON.stringify(payload, null, 2);

  if (fileId) {
    // Update existing file (PATCH)
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: fileContent
    });

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
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

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
  if (!accessToken) return null;

  const fileId = await findAppDataFileId();
  if (!fileId) return null;

  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) return null;
  return await res.json();
}
