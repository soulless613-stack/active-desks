/**
 * @file settings-modal.js
 * @description Settings, API Keys & Multi-Tier Device Sync Modal controller.
 */

import * as db from './db.js';
import { state } from './state.js';
import { exportFullBackup, importFullBackup } from './sync/export-provider.js';
import { createP2POffer } from './sync/p2p-provider.js';
import { setSyncBadge } from './sync/sync-manager.js';

/**
 * Updates the persistent Gemini API key status indicator in Settings.
 */
function updateGeminiStatusUI() {
  const dot = document.getElementById('gemini-status-dot');
  const text = document.getElementById('gemini-status-text');
  const key = state.settings?.gemini_api_key?.trim();

  if (dot && text) {
    if (key && key.length > 8) {
      dot.style.background = '#34d399';
      text.style.color = '#34d399';
      text.textContent = `Active: ${key.slice(0, 6)}...${key.slice(-4)}`;
    } else {
      dot.style.background = '#64748b';
      text.style.color = 'var(--text-muted)';
      text.textContent = 'No API key saved (Offline heuristics mode)';
    }
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

  // Bind API Key save button
  const saveKeyBtn = document.getElementById('btn-save-gemini-key');
  const keyInput = document.getElementById('settings-gemini-key');
  const groundingCheckbox = document.getElementById('settings-grounding-checkbox');

  if (saveKeyBtn && keyInput) {
    saveKeyBtn.addEventListener('click', async () => {
      const keyVal = keyInput.value.trim();
      const groundingVal = !!groundingCheckbox?.checked;

      state.settings.gemini_api_key = keyVal;
      state.settings.search_grounding_enabled = groundingVal;

      await db.put('settings', { key: 'gemini_api_key', value: keyVal, updatedAt: new Date().toISOString() });
      await db.put('settings', { key: 'search_grounding_enabled', value: groundingVal, updatedAt: new Date().toISOString() });

      updateGeminiStatusUI();
      saveKeyBtn.textContent = 'Saved! ✓';
      setTimeout(() => { saveKeyBtn.textContent = 'Save Key'; }, 2000);
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

      testKeyBtn.textContent = 'Testing...';
      try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(keyVal)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }]
          })
        });

        const data = await resp.json();
        if (resp.ok) {
          if (dot) dot.style.background = '#34d399';
          if (text) {
            text.textContent = '✓ Verified! Gemini API connected & ready.';
            text.style.color = '#34d399';
          }
          testKeyBtn.textContent = '✓ Verified';
        } else {
          if (dot) dot.style.background = '#f87171';
          if (text) {
            text.textContent = `⚠️ Error ${resp.status}: ${data.error?.message || 'Invalid API key'}`;
            text.style.color = '#f87171';
          }
          testKeyBtn.textContent = '⚠️ Invalid';
        }
      } catch (err) {
        if (dot) dot.style.background = '#f87171';
        if (text) {
          text.textContent = `Network error: ${err.message}`;
          text.style.color = '#f87171';
        }
        testKeyBtn.textContent = '⚠️ Error';
      }

      setTimeout(() => { testKeyBtn.textContent = '⚡ Test Key'; }, 3500);
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

  // Bind Provider radio changes
  document.querySelectorAll('input[name="sync_provider"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const provider = e.target.value;
      state.settings.sync_provider = provider;
      await db.put('settings', { key: 'sync_provider', value: provider, updatedAt: new Date().toISOString() });
      setSyncBadge('synced', provider === 'offline' ? 'Offline' : (provider === 'drive' ? 'Drive' : 'P2P'));
    });
  });
}

/**
 * Opens settings modal and synchronizes inputs with state.
 */
export function openSettingsModal() {
  const modal = document.getElementById('settings-modal');
  if (!modal) return;

  const keyInput = document.getElementById('settings-gemini-key');
  const groundingCheckbox = document.getElementById('settings-grounding-checkbox');

  if (keyInput) keyInput.value = state.settings?.gemini_api_key || '';
  if (groundingCheckbox) groundingCheckbox.checked = !!state.settings?.search_grounding_enabled;

  const currentProvider = state.settings?.sync_provider || 'offline';
  const targetRadio = document.querySelector(`input[name="sync_provider"][value="${currentProvider}"]`);
  if (targetRadio) targetRadio.checked = true;

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
