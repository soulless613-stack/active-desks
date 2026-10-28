/**
 * @file p2p-provider.js
 * @description Local Peer-to-Peer synchronization adapter using WebRTC DataChannels
 * and Web Crypto AES-GCM 256-bit encryption. Zero cloud relay required.
 */

let peerConnection = null;
let dataChannel = null;
let encryptionKey = null;

/**
 * Generates an ephemeral AES-GCM 256-bit symmetric encryption key for 1-time pairing.
 * 
 * @purpose Generates cryptographic key pair for device-to-device transport encryption.
 * @outputs {Promise<{ key: CryptoKey, exportedBase64: string }>}
 */
export async function generatePairingKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const raw = await crypto.subtle.exportKey('raw', key);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
  encryptionKey = key;

  return { key, exportedBase64: base64 };
}

/**
 * Imports a base64 encoded symmetric key string.
 */
export async function importPairingKey(base64Str) {
  const rawBytes = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));
  encryptionKey = await crypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
  return encryptionKey;
}

/**
 * Encrypts a string using AES-GCM 256-bit.
 */
export async function encryptPayload(plainText) {
  if (!encryptionKey) throw new Error('No pairing encryption key set');

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    encoded
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(cipherBuffer)))
  };
}

/**
 * Decrypts an encrypted payload.
 */
export async function decryptPayload(encryptedObj) {
  if (!encryptionKey) throw new Error('No pairing encryption key set');

  const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encryptedObj.data), c => c.charCodeAt(0));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    data
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Creates a WebRTC peer connection offer for QR code pairing.
 * 
 * @purpose Prepares local device to listen for inbound peer connections.
 * @outputs {Promise<string>} Base64 encoded pairing invitation.
 */
export async function createP2POffer() {
  const { exportedBase64 } = await generatePairingKey();

  peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  });

  dataChannel = peerConnection.createDataChannel('active-desks-sync');
  dataChannel.onopen = () => console.log('📡 P2P DataChannel open');
  dataChannel.onmessage = (e) => console.log('📩 P2P message received');

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  const payload = {
    sdp: offer.sdp,
    key: exportedBase64,
    device: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
  };

  return btoa(JSON.stringify(payload));
}
