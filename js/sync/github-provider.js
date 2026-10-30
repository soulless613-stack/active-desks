/**
 * @file github-provider.js
 * @description Dedicated GitHub PAT Cloud Sync Provider for Active Desks v2.0.
 * Directly communicates with GitHub REST API to read and write atomic state snapshots
 * to a private backup repository with zero server infrastructure.
 */

import * as db from '../db.js';
import { state, emit } from '../state.js';

const DEFAULT_REPO = 'soulless613-stack/active-desk-v2-backups';
const DEFAULT_BRANCH = 'main';
const SNAPSHOT_PATH = 'snapshot.json';

let cachedRemoteSha = null;

const getLocal = (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null);
const setLocal = (k, v) => { if (typeof localStorage !== 'undefined') localStorage.setItem(k, v); };

/**
 * Retrieves the active GitHub configuration from memory and localStorage.
 * 
 * @purpose Assembles API target coordinates and authentication headers.
 * @inputs None.
 * @outputs {{ token: string, repo: string, branch: string, path: string }} Active sync configuration.
 * @sideEffects None.
 */
export function getGitHubConfig() {
  const token = (
    state.settings?.github_token ||
    getLocal('active_desks_github_token') ||
    ''
  ).trim();

  const repo = (
    state.settings?.github_repo ||
    getLocal('active_desks_github_repo') ||
    DEFAULT_REPO
  ).trim();

  const branch = (
    state.settings?.github_branch ||
    getLocal('active_desks_github_branch') ||
    DEFAULT_BRANCH
  ).trim();

  return { token, repo, branch, path: SNAPSHOT_PATH };
}

/**
 * Saves and updates the GitHub sync credentials in memory and persistent storage.
 * 
 * @purpose Persists GitHub PAT and repository coordinates across browser sessions.
 * @inputs {object} config - Configuration patch.
 * @inputs {string} [config.token] - GitHub Personal Access Token.
 * @inputs {string} [config.repo] - Target repository (owner/repo).
 * @inputs {string} [config.branch] - Target branch name.
 * @outputs {Promise<void>}
 * @sideEffects Updates localStorage and IndexedDB settings store.
 */
export async function saveGitHubConfig({ token, repo, branch }) {
  if (token !== undefined) {
    const cleanToken = token.trim();
    setLocal('active_desks_github_token', cleanToken);
    state.settings.github_token = cleanToken;
    await db.put('settings', { key: 'github_token', value: cleanToken, updatedAt: new Date().toISOString() });
  }

  if (repo !== undefined) {
    const cleanRepo = repo.trim() || DEFAULT_REPO;
    setLocal('active_desks_github_repo', cleanRepo);
    state.settings.github_repo = cleanRepo;
    await db.put('settings', { key: 'github_repo', value: cleanRepo, updatedAt: new Date().toISOString() });
  }

  if (branch !== undefined) {
    const cleanBranch = branch.trim() || DEFAULT_BRANCH;
    setLocal('active_desks_github_branch', cleanBranch);
    state.settings.github_branch = cleanBranch;
    await db.put('settings', { key: 'github_branch', value: cleanBranch, updatedAt: new Date().toISOString() });
  }
}

/**
 * Checks whether a GitHub PAT is configured.
 * 
 * @purpose Fast synchronous guard for background sync queues.
 * @outputs {boolean} True if token exists.
 */
export function isGitHubConnected() {
  const { token } = getGitHubConfig();
  return !!token;
}

/**
 * Encodes a UTF-8 string into base64 safely without Latin-1 character truncation.
 * 
 * @purpose Guarantees emojis, accented characters, and unicode symbols encode cleanly.
 * @inputs {string} str - Raw UTF-8 text string.
 * @outputs {string} Base64 encoded string.
 */
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string into a UTF-8 string safely.
 * 
 * @purpose Decodes GitHub API file contents without corrupting multibyte characters.
 * @inputs {string} base64Str - Base64 encoded string.
 * @outputs {string} Decoded UTF-8 text.
 */
function base64ToUtf8(base64Str) {
  const clean = base64Str.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Tests connection to the designated GitHub repository using the active PAT.
 * 
 * @purpose Validates token scope and repository existence.
 * @inputs None.
 * @outputs {Promise<{ ok: boolean, message: string, fileExists: boolean }>} Test results.
 */
export async function testGitHubConnection() {
  const { token, repo, branch, path } = getGitHubConfig();
  if (!token) {
    throw new Error('Please enter a GitHub Personal Access Token.');
  }

  // 1. Verify repository access
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!repoRes.ok) {
    if (repoRes.status === 401) throw new Error('Invalid or expired Personal Access Token.');
    if (repoRes.status === 404) throw new Error(`Repository "${repo}" not found or token lacks access.`);
    throw new Error(`GitHub API HTTP ${repoRes.status}: ${repoRes.statusText}`);
  }

  // 2. Check if snapshot file already exists
  const fileRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  let fileExists = false;
  if (fileRes.ok) {
    const fileData = await fileRes.json();
    cachedRemoteSha = fileData.sha || null;
    fileExists = true;
  } else if (fileRes.status === 404) {
    cachedRemoteSha = null;
    fileExists = false;
  }

  return {
    ok: true,
    message: `Connected to ${repo} (${branch})`,
    fileExists
  };
}

/**
 * Pulls the remote state snapshot from GitHub and merges updates into IndexedDB.
 * 
 * @purpose Ingests newer changes made from other devices and updates reactive stores.
 * @outputs {Promise<{ status: string, countMerged: number }>}
 * @sideEffects Mutates IndexedDB stores and triggers UI re-renders via emit().
 */
export async function pullFromGitHub() {
  const { token, repo, branch, path } = getGitHubConfig();
  if (!token) return { status: 'unconfigured', countMerged: 0 };

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (res.status === 404) {
    // Brand new repository; no remote snapshot exists yet
    cachedRemoteSha = null;
    return { status: 'empty_remote', countMerged: 0 };
  }

  if (!res.ok) {
    throw new Error(`Failed to pull remote snapshot: HTTP ${res.status}`);
  }

  const data = await res.json();
  cachedRemoteSha = data.sha;

  if (!data.content) {
    return { status: 'empty_content', countMerged: 0 };
  }

  const jsonStr = base64ToUtf8(data.content);
  const remoteSnapshot = JSON.parse(jsonStr);

  let mergedCount = 0;
  const stores = remoteSnapshot?.stores;
  if (!stores) return { status: 'invalid_format', countMerged: 0 };

  // 1. Merge Desks
  if (Array.isArray(stores.desks)) {
    for (const remoteDesk of stores.desks) {
      if (!remoteDesk?.id) continue;
      const localDesk = await db.get('desks', remoteDesk.id);
      const remoteTime = new Date(remoteDesk.lastUpdated || 0).getTime();
      const localTime = new Date(localDesk?.lastUpdated || 0).getTime();

      if (!localDesk || remoteTime >= localTime) {
        await db.put('desks', remoteDesk);
        state.desks[remoteDesk.id] = remoteDesk;
        mergedCount++;
      }
    }
    // Update activeDeskIds selection if present
    const remoteSelection = stores.desks.find(d => d.id === 'active_selection');
    if (remoteSelection?.activeDeskIds) {
      state.activeDeskIds = remoteSelection.activeDeskIds;
    }
    emit('desks');
    emit('activeDeskIds');
  }

  // 2. Merge Anchors
  if (Array.isArray(stores.anchors)) {
    for (const remoteAnchor of stores.anchors) {
      if (!remoteAnchor?.date) continue;
      const localAnchor = await db.get('anchors', remoteAnchor.date);
      const remoteTime = new Date(remoteAnchor.updatedAt || 0).getTime();
      const localTime = new Date(localAnchor?.updatedAt || 0).getTime();

      if (!localAnchor || remoteTime >= localTime) {
        await db.put('anchors', remoteAnchor);
        if (remoteAnchor.date === state.anchors?.date) {
          state.anchors = remoteAnchor;
          emit('anchors');
        }
        mergedCount++;
      }
    }
  }

  // 3. Merge Captures
  if (Array.isArray(stores.captures)) {
    for (const remoteCapture of stores.captures) {
      if (!remoteCapture?.id) continue;
      const localCapture = await db.get('captures', remoteCapture.id);
      const remoteTime = new Date(remoteCapture.updatedAt || remoteCapture.createdAt || 0).getTime();
      const localTime = new Date(localCapture?.updatedAt || localCapture?.createdAt || 0).getTime();

      if (!localCapture || remoteTime >= localTime) {
        await db.put('captures', remoteCapture);
        mergedCount++;
      }
    }
  }

  return { status: 'synced', countMerged: mergedCount, sha: cachedRemoteSha };
}

/**
 * Pushes the full IndexedDB state snapshot to GitHub in a single atomic commit.
 * 
 * @purpose Serializes local stores into snapshot.json and commits via GitHub REST API.
 * @inputs {boolean} [useKeepalive=false] - Whether to use the keepalive flag for page close/hide.
 * @outputs {Promise<{ status: string, sha: string }>} Commit result.
 * @sideEffects Performs network write to remote GitHub repository.
 */
export async function pushToGitHub(useKeepalive = false) {
  const { token, repo, branch, path } = getGitHubConfig();
  if (!token) return { status: 'unconfigured' };

  // 1. Compile entire IndexedDB state into unified snapshot envelope
  const [desks, anchors, captures] = await Promise.all([
    db.getAll('desks'),
    db.getAll('anchors'),
    db.getAll('captures')
  ]);

  const payload = {
    version: '2.0',
    syncedAt: new Date().toISOString(),
    stores: {
      desks,
      anchors,
      captures
    }
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const base64Content = utf8ToBase64(jsonStr);

  // 2. If we don't have the cached remote SHA, query GitHub to check if file exists
  if (!cachedRemoteSha) {
    try {
      const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (checkRes.ok) {
        const fileInfo = await checkRes.json();
        cachedRemoteSha = fileInfo.sha || null;
      }
    } catch (e) {
      console.warn('Could not inspect remote snapshot SHA prior to push:', e);
    }
  }

  // 3. Assemble atomic commit body
  const commitBody = {
    message: `Sync state snapshot (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
    content: base64Content,
    branch
  };

  if (cachedRemoteSha) {
    commitBody.sha = cachedRemoteSha;
  }

  const putOptions = {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commitBody)
  };

  if (useKeepalive) {
    putOptions.keepalive = true;
  }

  let putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, putOptions);

  // 4. Handle 409 SHA conflict: Remote advanced; re-fetch latest SHA and retry once
  if (putRes.status === 409) {
    console.warn('GitHub snapshot SHA conflict detected (409). Re-fetching latest SHA and retrying...');
    const refetchRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (refetchRes.ok) {
      const freshData = await refetchRes.json();
      cachedRemoteSha = freshData.sha;
      commitBody.sha = cachedRemoteSha;
      putOptions.body = JSON.stringify(commitBody);
      putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, putOptions);
    }
  }

  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({}));
    throw new Error(`GitHub PUT failed (HTTP ${putRes.status}): ${errData.message || putRes.statusText}`);
  }

  const resultData = await putRes.json();
  cachedRemoteSha = resultData.content?.sha || null;

  return { status: 'synced', sha: cachedRemoteSha };
}
