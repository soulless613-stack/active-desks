/**
 * @file settings-modal.js
 * @description Settings, API Keys & Multi-Tier Device Sync Modal controller.
 */

import * as db from './db.js';
import { state, APP_VERSION } from './state.js';
import { exportFullBackup, importFullBackup } from './sync/export-provider.js';
import { createP2POffer } from './sync/p2p-provider.js';
import { setSyncBadge, performSync } from './sync/sync-manager.js';
import {
  initDriveTokenClient,
  requestDriveAuth,
  isDriveConnected,
  getDriveUserEmail,
  syncWithDrive,
  restoreDriveSession
} from './sync/drive-provider.js';

/**
 * Updates the persistent Gemini API key status indicator in Settings.
 */
function updateGeminiStatusUI() {
  const dot = document.getElementById('gemini-status-dot');
  const text = document.getElementById('gemini-status-text');
  const key = state.settings?.gemini_api_key?.trim();
  const currentModel = state.settings?.gemini_model || 'gemini-3.5-flash-lite';

  if (dot && text) {
    if (key && key.length > 8) {
      dot.style.background = '#34d399';
      text.style.color = '#34d399';
      text.textContent = `Active (${currentModel}): ${key.slice(0, 6)}...${key.slice(-4)}`;
    } else {
      dot.style.background = '#64748b';
      text.style.color = 'var(--text-muted)';
      text.textContent = 'No API key saved (Offline heuristics mode)';
    }
  }
}

/**
 * Dynamically queries available Gemini models from the API for the given key,
 * filters for text generation / interactions compatibility, and populates the dropdown.
 *
 * @purpose Ensures only valid, authorized models for the user's key appear in the UI.
 * @inputs {string} apiKey - Gemini API key.
 * @outputs {Promise<Array<string>>} List of discovered valid model names.
 */
export async function populateModelsFromAPI(apiKey) {
  const modelSelect = document.getElementById('settings-gemini-model');
  if (!modelSelect || !apiKey) return [];

  try {
    const modelsResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    const modelsData = await modelsResp.json();

    if (!modelsResp.ok) {
      throw new Error(`Google API ${modelsResp.status}: ${modelsData.error?.message || 'Unauthorized or invalid key'}`);
    }

    const modelsList = modelsData.models || [];
    // Filter for text generation capable models strictly belonging to the Gemini family, excluding heavy/audio models
    const textModels = modelsList.filter(m => {
      const name = (m.name || '').toLowerCase();
      const isGemini = name.includes('gemini');
      const methods = m.supportedGenerationMethods || [];
      const canGenerate = methods.includes('generateContent') || methods.includes('interactions');
      const isDeprecated = name.includes('2.0') || name.includes('1.5');
      const isHeavyOrAudio = /omni|live|audio|video|argon|pro|imagen|embedding|tts/i.test(name);
      return isGemini && canGenerate && !isDeprecated && !isHeavyOrAudio;
    });

    if (textModels.length === 0) {
      // Fallback: at least show Gemini models supporting generateContent if filter was too strict
      modelsList.forEach(m => {
        const name = (m.name || '').toLowerCase();
        if (name.includes('gemini') && (m.supportedGenerationMethods || []).includes('generateContent') && !/tts|audio|video|embedding/i.test(name)) {
          textModels.push(m);
        }
      });
    }

    // Sort models: flash-lite first, then other flash models, then alphabetical
    textModels.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aIsLite = aName.includes('flash-lite');
      const bIsLite = bName.includes('flash-lite');
      if (aIsLite && !bIsLite) return -1;
      if (!aIsLite && bIsLite) return 1;
      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' });
    });

    // Populate the dropdown
    modelSelect.innerHTML = '';
    const currentSaved = state.settings?.gemini_model;
    let selectedFound = false;

    for (const m of textModels) {
      const cleanId = m.name.replace(/^models\//, '');
      const opt = document.createElement('option');
      opt.value = cleanId;
      const display = m.displayName ? `${m.displayName} (${cleanId})` : cleanId;
      opt.textContent = display;
      if (cleanId === currentSaved) {
        opt.selected = true;
        selectedFound = true;
      }
      modelSelect.appendChild(opt);
    }

    // If saved model wasn't found or was invalid, select the first one (recommended flash-lite)
    if (!selectedFound && textModels.length > 0) {
      const defaultModel = textModels[0].name.replace(/^models\//, '');
      modelSelect.value = defaultModel;
      state.settings.gemini_model = defaultModel;
      await db.put('settings', { key: 'gemini_model', value: defaultModel, updatedAt: new Date().toISOString() });
      updateGeminiStatusUI();
    }

    return textModels.map(m => m.name.replace(/^models\//, ''));
  } catch (err) {
    console.warn('Failed to populate models from API:', err);
    throw err;
  }
}

/**
 * Initializes the settings modal UI and binds event listeners.
 */
export function initSettingsModal() {
  const syncBadge = document.getElementById('header-sync-badge');
  const modal = document.getElementById('settings-modal');

  if (syncBadge && modal) {
    syncBadge.addEventListener('click', () => {
      openSettingsModal();
    });
  }

  // Bind 1-tap cache clear and reload
  const reloadBtn = document.getElementById('btn-force-cache-refresh');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', async () => {
      reloadBtn.textContent = 'Purging...';
      try {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) await reg.unregister();
        }
        if ('caches' in window) {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map(k => caches.delete(k)));
        }
      } catch (e) {
        console.warn('Cache clear error:', e);
      }
      window.location.reload(true);
    });
  }

  // Bind API Key save button
  const saveKeyBtn = document.getElementById('btn-save-gemini-key');
  const keyInput = document.getElementById('settings-gemini-key');
  const groundingCheckbox = document.getElementById('settings-grounding-checkbox');

  if (saveKeyBtn && keyInput) {
    saveKeyBtn.addEventListener('click', async () => {
      const keyVal = keyInput.value.trim();
      const groundingVal = !!groundingCheckbox?.checked;
      const modelVal = document.getElementById('settings-gemini-model')?.value || 'gemini-3.5-flash-lite';

      state.settings.gemini_api_key = keyVal;
      state.settings.search_grounding_enabled = groundingVal;
      state.settings.gemini_model = modelVal;

      await db.put('settings', { key: 'gemini_api_key', value: keyVal, updatedAt: new Date().toISOString() });
      await db.put('settings', { key: 'search_grounding_enabled', value: groundingVal, updatedAt: new Date().toISOString() });
      await db.put('settings', { key: 'gemini_model', value: modelVal, updatedAt: new Date().toISOString() });

      updateGeminiStatusUI();
      saveKeyBtn.textContent = 'Saved! ✓';
      setTimeout(() => { saveKeyBtn.textContent = 'Save Key'; }, 2000);
    });
  }

  // Bind Model selector change
  const modelSelect = document.getElementById('settings-gemini-model');
  if (modelSelect) {
    modelSelect.addEventListener('change', async (e) => {
      const selected = e.target.value;
      state.settings.gemini_model = selected;
      await db.put('settings', { key: 'gemini_model', value: selected, updatedAt: new Date().toISOString() });
      updateGeminiStatusUI();
    });
  }

  // Bind Test Gemini Key button
  const testKeyBtn = document.getElementById('btn-test-gemini-key');
  if (testKeyBtn) {
    testKeyBtn.addEventListener('click', async () => {
      const keyVal = keyInput?.value?.trim() || state.settings?.gemini_api_key?.trim();
      const dot = document.getElementById('gemini-status-dot');
      const text = document.getElementById('gemini-status-text');

      if (!keyVal) {
        if (text) {
          text.textContent = '⚠️ Paste an API key above before testing';
          text.style.color = '#f87171';
        }
        return;
      }

      testKeyBtn.textContent = 'Discovering...';
      try {
        const availableModels = await populateModelsFromAPI(keyVal);
        if (availableModels.length === 0) {
          throw new Error('No compatible text generation models found for this key');
        }

        const modelSelectEl = document.getElementById('settings-gemini-model');
        const chosenModel = modelSelectEl?.value || availableModels[0];

        state.settings.gemini_model = chosenModel;
        await db.put('settings', { key: 'gemini_model', value: chosenModel, updatedAt: new Date().toISOString() });
        updateGeminiStatusUI();

        // 2. Perform verification ping with discovered model via Interactions API (or generateContent fallback)
        testKeyBtn.textContent = `Pinging ${chosenModel}...`;
        let pingOk = false;
        let pingErrorMsg = '';

        // Try Interactions API first (required for Gemini 3.8 / 4.x models)
        try {
          const intResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(keyVal)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: chosenModel,
              input: 'ping'
            })
          });
          if (intResp.ok) {
            pingOk = true;
          } else {
            const errData = await intResp.json().catch(() => ({}));
            pingErrorMsg = errData.error?.message || `HTTP ${intResp.status}`;
          }
        } catch (e) {
          pingErrorMsg = e.message;
        }

        // If Interactions API failed, try generateContent fallback
        if (!pingOk) {
          try {
            const pingResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${chosenModel}:generateContent?key=${encodeURIComponent(keyVal)}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: 'ping' }] }]
              })
            });
            if (pingResp.ok) {
              pingOk = true;
            } else {
              const pingErr = await pingResp.json().catch(() => ({}));
              pingErrorMsg = pingErr.error?.message || `HTTP ${pingResp.status}`;
            }
          } catch (e) {
            pingErrorMsg = e.message;
          }
        }

        if (pingOk) {
          if (dot) dot.style.background = '#34d399';
          if (text) {
            text.textContent = `✓ Verified! Model: ${chosenModel}`;
            text.style.color = '#34d399';
          }
          testKeyBtn.textContent = '✓ Verified';
        } else {
          throw new Error(`Ping failed: ${pingErrorMsg}`);
        }
      } catch (err) {
        if (dot) dot.style.background = '#f87171';
        if (text) {
          text.textContent = `⚠️ ${err.message}`;
          text.style.color = '#f87171';
        }
        testKeyBtn.textContent = '⚠️ Test Failed';
      }

      setTimeout(() => { testKeyBtn.textContent = '⚡ Discover Models & Test'; }, 3500);
    });
  }

  // Bind Export Backup button
  const exportBtn = document.getElementById('btn-export-backup');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      exportBtn.textContent = 'Exporting...';
      try {
        await exportFullBackup();
        exportBtn.textContent = 'Exported! ✓';
      } catch (err) {
        exportBtn.textContent = 'Error';
      }
      setTimeout(() => { exportBtn.textContent = '📥 Export JSON Backup'; }, 2500);
    });
  }

  // Bind Import Backup button
  const importInput = document.getElementById('settings-import-file');
  const importBtn = document.getElementById('btn-import-backup');
  if (importBtn && importInput) {
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      importBtn.textContent = 'Importing...';
      try {
        const counts = await importFullBackup(file);
        alert(`Backup imported successfully! Restored ${counts.captures} captures, ${counts.desks} desks, ${counts.anchors} anchors.`);
        window.location.reload();
      } catch (err) {
        alert('Import failed: ' + err.message);
        importBtn.textContent = '📤 Import JSON Backup';
      }
    });
  }

  // Bind P2P QR pair button
  const p2pBtn = document.getElementById('btn-show-p2p-qr');
  if (p2pBtn) {
    p2pBtn.addEventListener('click', async () => {
      try {
        p2pBtn.textContent = 'Generating...';
        const invitation = await createP2POffer();
        showP2PQROverlay(invitation);
      } catch (err) {
        alert('Could not start P2P pairing: ' + err.message);
      } finally {
        p2pBtn.textContent = 'Pair via QR Code';
      }
    });
  }

  // Bind Drive Configuration controls
  const driveClientIdInput = document.getElementById('input-drive-client-id');
  const btnSaveDriveId = document.getElementById('btn-save-drive-client-id');
  const btnConnectDrive = document.getElementById('btn-connect-drive');
  const btnSyncDriveNow = document.getElementById('btn-sync-drive-now');

  if (btnSaveDriveId && driveClientIdInput) {
    btnSaveDriveId.addEventListener('click', async () => {
      const clientId = driveClientIdInput.value.trim();
      state.settings.drive_client_id = clientId;
      await db.put('settings', { key: 'drive_client_id', value: clientId, updatedAt: new Date().toISOString() });
      btnSaveDriveId.textContent = '✓ Saved';
      setTimeout(() => { btnSaveDriveId.textContent = 'Save ID'; }, 1800);

      if (clientId) {
        initDriveTokenClient(clientId, handleDriveTokenReceived);
      }
    });
  }

  if (btnConnectDrive) {
    btnConnectDrive.addEventListener('click', () => {
      const clientId = driveClientIdInput?.value?.trim() || state.settings?.drive_client_id?.trim();
      if (!clientId) {
        alert('Please enter and save your Google OAuth 2.0 Web Client ID first.');
        driveClientIdInput?.focus();
        return;
      }

      initDriveTokenClient(clientId, handleDriveTokenReceived);
      try {
        requestDriveAuth();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  if (btnSyncDriveNow) {
    btnSyncDriveNow.addEventListener('click', async () => {
      btnSyncDriveNow.textContent = '⏳ Syncing...';
      try {
        const res = await syncWithDrive();
        btnSyncDriveNow.textContent = '✓ Synced';
        setSyncBadge('synced', 'Synced');
        setTimeout(() => { btnSyncDriveNow.textContent = '⚡ Sync Now'; }, 2000);
      } catch (err) {
        btnSyncDriveNow.textContent = '⚠️ Failed';
        setSyncBadge('error', 'Sync Error');
        setTimeout(() => { btnSyncDriveNow.textContent = '⚡ Sync Now'; }, 2500);
      }
    });
  }

  // Bind Provider radio changes
  document.querySelectorAll('input[name="sync_provider"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const provider = e.target.value;
      state.settings.sync_provider = provider;
      await db.put('settings', { key: 'sync_provider', value: provider, updatedAt: new Date().toISOString() });
      updateDriveConfigPanelVisibility();
      setSyncBadge('synced', provider === 'offline' ? 'Offline' : (provider === 'drive' ? (isDriveConnected() ? 'Drive' : 'Local') : 'P2P'));
    });
  });
}

function handleDriveTokenReceived(response) {
  if (response.error) {
    alert('Google authorization failed: ' + response.error);
    return;
  }
  updateDriveStatusUI();
  performSync();
}

function updateDriveConfigPanelVisibility() {
  const panel = document.getElementById('drive-config-panel');
  if (!panel) return;
  const isDriveSelected = (state.settings?.sync_provider || 'offline') === 'drive';
  panel.style.display = isDriveSelected ? 'block' : 'none';
}

function updateDriveStatusUI() {
  const dot = document.getElementById('drive-auth-dot');
  const text = document.getElementById('drive-auth-text');
  const connectBtn = document.getElementById('btn-connect-drive');
  const syncNowBtn = document.getElementById('btn-sync-drive-now');

  if (!dot || !text) return;

  if (isDriveConnected()) {
    const email = getDriveUserEmail() || 'Google Account';
    dot.style.background = '#34d399';
    text.style.color = '#34d399';
    text.textContent = `Connected: ${email}`;
    if (connectBtn) connectBtn.textContent = '🔄 Re-authorize';
    if (syncNowBtn) syncNowBtn.style.display = 'inline-flex';
  } else {
    // Check if re-authorization is needed
    const hadToken = !!localStorage.getItem('active_desks_drive_token_expires');
    const clientId = state.settings?.drive_client_id;
    if (hadToken && clientId) {
      dot.style.background = '#fbbf24';
      text.style.color = '#fbbf24';
      text.textContent = '⚠️ Re-authorization required. Tap to reconnect.';
    } else {
      dot.style.background = '#64748b';
      text.style.color = 'var(--text-muted)';
      text.textContent = 'Not Connected';
    }
    if (connectBtn) connectBtn.textContent = '🔗 Connect Google Account';
    if (syncNowBtn) syncNowBtn.style.display = 'none';
  }
}

/**
 * Opens settings modal and synchronizes inputs with state.
 */
export function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  const keyInput = document.getElementById('settings-gemini-key');
  const groundingCheckbox = document.getElementById('settings-grounding-checkbox');
  const driveClientIdInput = document.getElementById('input-drive-client-id');
  const modelSelect = document.getElementById('settings-gemini-model');

  const currentKey = state.settings?.gemini_api_key?.trim();
  if (keyInput) keyInput.value = currentKey || '';
  if (groundingCheckbox) groundingCheckbox.checked = !!state.settings?.search_grounding_enabled;
  if (driveClientIdInput) driveClientIdInput.value = state.settings?.drive_client_id || '';
  if (modelSelect) modelSelect.value = state.settings?.gemini_model || 'gemini-3.5-flash-lite';

  // Automatically discover and populate models if API key exists
  if (currentKey) {
    populateModelsFromAPI(currentKey).catch(() => {});
  }

  const currentProvider = state.settings?.sync_provider || 'offline';
  const targetRadio = document.querySelector(`input[name="sync_provider"][value="${currentProvider}"]`);
  if (targetRadio) targetRadio.checked = true;

  if (currentProvider === 'drive' && !isDriveConnected()) {
    restoreDriveSession();
  }

  const versionEl = document.getElementById('settings-cache-version');
  if (versionEl) versionEl.textContent = `(${APP_VERSION.replace('active-desks-v2-', 'v')})`;

  updateDriveConfigPanelVisibility();
  updateDriveStatusUI();
  updateGeminiStatusUI();
  modal.classList.add('active');
}

function showP2PQROverlay(invitationString) {
  const qrModal = document.getElementById('qr-pair-modal');
  const rawTextEl = document.getElementById('qr-invitation-text');
  if (qrModal) {
    if (rawTextEl) rawTextEl.textContent = invitationString;
    qrModal.classList.add('active');
  }
}
