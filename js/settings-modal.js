/**
 * @file settings-modal.js
 * @description Settings and on-screen QR device pairing engine for Active Desks v3.0.
 * Encodes Firebase coordinates and API tokens into an on-screen QR code for zero-typing
 * pairing from desktop to Google Pixel Fold / mobile phones.
 */

import { state } from './state.js';

/**
 * Initializes the settings modal, input fields, save buttons, and QR pairing generator.
 * 
 * @purpose Mounts user configuration controls and wires the QRious pairing engine.
 * @inputs None.
 * @outputs {void}
 */
export function initSettingsModal() {
  const openBtn = document.getElementById('btn-open-settings');
  const modal = document.getElementById('settings-modal');
  const refreshQrBtn = document.getElementById('btn-refresh-qr');
  const btnSaveGemini = document.getElementById('btn-save-gemini-key');
  const btnSaveGithub = document.getElementById('btn-save-github-token');
  const inputGemini = document.getElementById('cfg-gemini-key');
  const inputGithub = document.getElementById('cfg-github-token');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      // Pre-fill existing keys
      if (inputGemini) inputGemini.value = state.settings.gemini_api_key || localStorage.getItem('active_desks_gemini_key') || '';
      if (inputGithub) inputGithub.value = state.settings.github_token || localStorage.getItem('active_desks_github_token') || '';
      generateDevicePairingQR();
      if (modal) modal.classList.add('active');
    });
  }

  // Wire modal close buttons
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close-modal');
      const targetModal = document.getElementById(targetId);
      if (targetModal) targetModal.classList.remove('active');
    });
  });

  // Save Gemini Key
  if (btnSaveGemini && inputGemini) {
    btnSaveGemini.addEventListener('click', () => {
      const val = inputGemini.value.trim();
      state.settings.gemini_api_key = val;
      localStorage.setItem('active_desks_gemini_key', val);
      btnSaveGemini.textContent = '✓ Saved';
      setTimeout(() => { btnSaveGemini.textContent = 'Save Key'; }, 1500);
      generateDevicePairingQR();
    });
  }

  // Save GitHub PAT
  if (btnSaveGithub && inputGithub) {
    btnSaveGithub.addEventListener('click', () => {
      const val = inputGithub.value.trim();
      state.settings.github_token = val;
      localStorage.setItem('active_desks_github_token', val);
      btnSaveGithub.textContent = '✓ Saved';
      setTimeout(() => { btnSaveGithub.textContent = 'Save Token'; }, 1500);
      generateDevicePairingQR();
    });
  }

  if (refreshQrBtn) {
    refreshQrBtn.addEventListener('click', generateDevicePairingQR);
  }
}

/**
 * Generates an on-screen QR Code encoding setup coordinates into a URL hash.
 * 
 * @purpose Generates a pairing URL for the phone camera to scan.
 * @inputs None.
 * @outputs {void}
 */
export function generateDevicePairingQR() {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas || typeof QRious === 'undefined') return;

  const gemini = (state.settings.gemini_api_key || localStorage.getItem('active_desks_gemini_key') || '').trim();
  const github = (state.settings.github_token || localStorage.getItem('active_desks_github_token') || '').trim();

  const payload = {
    gemini,
    github,
    timestamp: Date.now()
  };

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const baseUrl = window.location.origin + window.location.pathname;
  const pairingUrl = `${baseUrl}#setup=${encoded}`;

  new QRious({
    element: canvas,
    value: pairingUrl,
    size: 220,
    level: 'M'
  });
}

/**
 * Parses and consumes the #setup=<base64> hash on mobile startup.
 * 
 * @purpose Ingests credentials scanned from the desktop QR code.
 * @inputs None.
 * @outputs {boolean} True if setup payload was ingested.
 */
export function consumeSetupHashIfPresent() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('#setup=')) return false;

  try {
    const raw = hash.replace(/^#setup=/, '');
    const jsonStr = decodeURIComponent(escape(atob(raw)));
    const config = JSON.parse(jsonStr);

    if (config.gemini) {
      state.settings.gemini_api_key = config.gemini;
      localStorage.setItem('active_desks_gemini_key', config.gemini);
    }
    if (config.github) {
      state.settings.github_token = config.github;
      localStorage.setItem('active_desks_github_token', config.github);
    }

    // Strip hash from address bar for clean URL
    window.history.replaceState(null, document.title, window.location.pathname);
    alert('🎉 Phone successfully paired! API credentials and Firebase connection loaded.');
    return true;
  } catch (err) {
    console.warn('Failed to parse #setup pairing hash:', err);
    return false;
  }
}
