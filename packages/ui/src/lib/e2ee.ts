// src/lib/e2ee.ts
import * as nacl from "tweetnacl";

// Detect a real Node.js environment vs browser-with-Buffer-polyfill
const isNode =
  typeof process !== "undefined" &&
  !!(process as any).versions &&
  !!(process as any).versions.node;

export function u8ToB64(u8: Uint8Array): string {
  if (isNode) {
    // True Node.js path
    return Buffer.from(u8).toString("base64");
  }
  // Browser-safe path using btoa
  let s = "";
  for (let i = 0; i < u8.length; i++) {
    s += String.fromCharCode(u8[i]);
  }
  return btoa(s);
}

export function b64ToU8(b64: string): Uint8Array {
  if (isNode) {
    // True Node.js path
    return new Uint8Array(Buffer.from(b64, "base64"));
  }
  // Browser-safe path using atob
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    u8[i] = bin.charCodeAt(i);
  }
  return u8;
}

// Storage key for local E2EE keypair
const LS = "cps.encKeypair.v1";

/**
 * Convert BigInt to Uint8Array (little-endian, fixed 32 bytes)
 */
function bigIntToBytes32(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  let remaining = value;
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number(remaining & 0xffn);
    remaining = remaining >> 8n;
  }
  return bytes;
}

/**
 * Derive Curve25519 keypair directly from wallet signature seed
 * This is the SECURE approach: seed is never stored, only the derived public key is stored in DB
 * 
 * @param seed - The wallet signature seed (BigInt)
 * @returns Curve25519 keypair (public + secret, base64 encoded)
 */
export function deriveCurve25519KeypairFromSeed(seed: bigint): {
  publicKeyB64: string;
  secretKeyB64: string;
} {
  // Convert seed to 32 bytes (little-endian) for use as Curve25519 seed
  const max32Bytes = BigInt('0x' + 'ff'.repeat(32));
  const normalizedSeed = seed % max32Bytes;
  const seedBytes = bigIntToBytes32(normalizedSeed);
  
  // Use nacl's keyPair.fromSecretKey() which is deterministic
  // This creates a Curve25519 keypair from the seed
  const kp = nacl.box.keyPair.fromSecretKey(seedBytes);
  
  return {
    publicKeyB64: u8ToB64(kp.publicKey),
    secretKeyB64: u8ToB64(kp.secretKey),
  };
}

// Use SDK functions if available, otherwise fallback to local implementation
function getSDKFunction(name: string): any {
  if (typeof window !== 'undefined' && (window as any).CipherPaySDK) {
    return (window as any).CipherPaySDK[name];
  }
  return null;
}

/**
 * Derive encryption keypair from note encryption public key (for sender/encryption)
 * Uses SDK function if available, otherwise falls back to local implementation
 */
function deriveKeypairFromIdentityPubKey(noteEncPubKey: bigint | string): {
  publicKeyB64: string;
  secretKeyB64: string;
} {
  const sdkFn = getSDKFunction('deriveKeypairFromNoteEncPubKey');
  if (sdkFn) {
    return sdkFn(noteEncPubKey);
  }
  
  // Fallback to local implementation (for backward compatibility)
  const pubKeyBI = typeof noteEncPubKey === 'string' 
    ? BigInt(noteEncPubKey.startsWith('0x') ? noteEncPubKey : `0x${noteEncPubKey}`)
    : noteEncPubKey;
  
  const max32Bytes = BigInt('0x' + 'ff'.repeat(32));
  const normalizedPubKey = pubKeyBI % max32Bytes;
  const seedBytes = bigIntToBytes32(normalizedPubKey);
  const kp = nacl.box.keyPair.fromSecretKey(seedBytes);
  
  return {
    publicKeyB64: u8ToB64(kp.publicKey),
    secretKeyB64: u8ToB64(kp.secretKey),
  };
}

/**
 * Derive encryption keypair from identity privKey (for recipient/decryption)
 * Uses SDK function if available, otherwise falls back to local implementation
 */
function deriveKeypairFromIdentityPrivKey(identityPrivKey: bigint): {
  publicKeyB64: string;
  secretKeyB64: string;
} {
  const sdkFn = getSDKFunction('deriveKeypairFromIdentityPrivKey');
  if (sdkFn) {
    return sdkFn(identityPrivKey);
  }
  
  // Fallback to local implementation (for backward compatibility)
  const max32Bytes = BigInt('0x' + 'ff'.repeat(32));
  const normalizedPrivKey = identityPrivKey % max32Bytes;
  const seedBytes = bigIntToBytes32(normalizedPrivKey);
  const kp = nacl.box.keyPair.fromSecretKey(seedBytes);
  
  return {
    publicKeyB64: u8ToB64(kp.publicKey),
    secretKeyB64: u8ToB64(kp.secretKey),
  };
}

/**
 * Derive encryption public key from note encryption public key (for sender)
 * Uses SDK function if available, otherwise falls back to local implementation
 */
export function deriveEncPublicKeyFromIdentityPubKey(noteEncPubKey: bigint | string): string {
  const sdkFn = getSDKFunction('deriveEncPublicKeyFromNoteEncPubKey');
  if (sdkFn) {
    return sdkFn(noteEncPubKey);
  }
  
  // Fallback to local implementation
  const keypair = deriveKeypairFromIdentityPubKey(noteEncPubKey);
  return keypair.publicKeyB64;
}

/**
 * Get CipherPay identity's private key (privKey) from localStorage
 * This is used to derive the encryption keypair (only recipient can do this)
 * 
 * Returns the privKey from the identity keypair, which is derived
 * from the wallet signature (not the actual wallet private key).
 * 
 * SECURITY: Only the recipient can compute their privKey (requires wallet signature).
 * This privKey is used to derive the encryption secret key for decryption.
 */
/**
 * Get CipherPay identity's public key (pubKey) from localStorage
 * This is used to derive the encryption keypair (matches what sender uses from DB)
 * 
 * Returns the pubKey from the identity keypair, which is derived
 * from the wallet signature (not the actual wallet private key).
 * 
 * This pubKey is stored in the DB as note_enc_pub_key and used by senders
 * to derive the encryption public key. Recipients use the same pubKey
 * to derive the matching encryption keypair (including secret key for decryption).
 * 
 * Both sender and recipient derive from the same pubKey (which comes from the same seed),
 * ensuring they get the same encryption keypair.
 */
function getCipherPayPubKey(): bigint | null {
  try {
    const storedIdentity = localStorage.getItem('cipherpay_identity');
    if (!storedIdentity) {
      console.log("[e2ee] No identity found in localStorage under key 'cipherpay_identity'");
      return null;
    }
    
    const parsed = JSON.parse(storedIdentity);
    const keypair = parsed?.keypair;
    if (!keypair || !keypair.pubKey) {
      console.warn("[e2ee] Identity found but missing keypair or pubKey:", {
        hasKeypair: !!keypair,
        hasPubKey: !!keypair?.pubKey,
      });
      return null;
    }
    
    // Convert to BigInt
    const toBigInt = (val: any): bigint => {
      if (typeof val === 'bigint') return val;
      if (typeof val === 'string') {
        if (val.startsWith('0x')) return BigInt(val);
        if (/^-?\d+$/.test(val)) return BigInt(val);
      }
      if (typeof val === 'number') return BigInt(val);
      return BigInt(0);
    };
    
    const pubKey = toBigInt(keypair.pubKey);
    console.log("[e2ee] Retrieved identity pubKey from localStorage");
    return pubKey;
  } catch (e) {
    console.warn('[e2ee] Failed to get CipherPay identity pubKey:', e);
    return null;
  }
}

/**
 * Get CipherPay identity's private key (privKey) from localStorage
 * This is used to derive the encryption keypair on the fly (for decryption)
 * 
 * SECURITY: The privKey is derived from wallet signature (not the actual wallet private key).
 * This privKey is used to derive the encryption secret key for decryption.
 * The encryption keypair should NOT be stored - it should be derived on the fly from this privKey.
 */
function getCipherPayPrivKey(): bigint | null {
  try {
    const storedIdentity = localStorage.getItem('cipherpay_identity');
    if (!storedIdentity) {
      console.log("[e2ee] No identity found in localStorage under key 'cipherpay_identity'");
      return null;
    }
    
    const parsed = JSON.parse(storedIdentity);
    const keypair = parsed?.keypair;
    if (!keypair || !keypair.privKey) {
      console.warn("[e2ee] Identity found but missing keypair or privKey:", {
        hasKeypair: !!keypair,
        hasPrivKey: !!keypair?.privKey,
      });
      return null;
    }
    
    // Convert to BigInt
    const toBigInt = (val: any): bigint => {
      if (typeof val === 'bigint') return val;
      if (typeof val === 'string') {
        if (val.startsWith('0x')) return BigInt(val);
        if (/^-?\d+$/.test(val)) return BigInt(val);
      }
      if (typeof val === 'number') return BigInt(val);
      return BigInt(0);
    };
    
    const privKey = toBigInt(keypair.privKey);
    console.log("[e2ee] Retrieved identity privKey from localStorage");
    return privKey;
  } catch (e) {
    console.warn('[e2ee] Failed to get CipherPay identity privKey:', e);
    return null;
  }
}

// Helper to get encryption keypair - derived on the fly from wallet signature seed (NOT stored)
// SECURITY: The encryption secret key is never stored, only derived on demand from normalizedSeed
// Both cipherpay-ui and zkaudit-ui derive the same keypair from the same normalizedSeed
export function ensureValidKeypair(): {
  publicKeyB64: string;
  secretKeyB64: string;
} {
  // SECURE APPROACH: Derive Curve25519 keypair on the fly from normalizedSeed (wallet signature seed)
  // The normalizedSeed is stored in identity (derived from wallet signature, not wallet private key)
  // Both cipherpay-ui and zkaudit-ui can derive the same keypair from this seed
  try {
    const storedIdentity = localStorage.getItem('cipherpay_identity');
    if (storedIdentity) {
      const identity = JSON.parse(storedIdentity);
      if (identity?.normalizedSeed) {
        const normalizedSeed = BigInt(identity.normalizedSeed);
        const derived = deriveCurve25519KeypairFromSeed(normalizedSeed);
        
        // Verify the encoding worked correctly
        const verifyPub = b64ToU8(derived.publicKeyB64);
        const verifySec = b64ToU8(derived.secretKeyB64);
        if (verifyPub.length === 32 && verifySec.length === 32) {
          // DO NOT store the keypair - return it directly
          return derived;
        } else {
          console.error("[e2ee] Derived keypair has invalid lengths:", {
            pubLen: verifyPub.length,
            secLen: verifySec.length,
          });
        }
      }
    }
  } catch (e) {
    console.error("[e2ee] Failed to derive keypair from normalizedSeed:", e);
  }

  // Fallback: If identity is not available, we cannot derive the keypair
  // This should not happen in normal operation - user needs to authenticate first
  throw new Error(
    "[e2ee] Cannot derive encryption keypair: identity not available or missing normalizedSeed. Please authenticate first."
  );
}

export function getOrCreateLocalEncKeypair(): {
  publicKeyB64: string;
  secretKeyB64: string;
} {
  return ensureValidKeypair();
}

export function getLocalEncPublicKeyB64(): string {
  return ensureValidKeypair().publicKeyB64;
}

export function encryptForRecipient(recipientPubB64: string, obj: unknown): string {
  const recipientPk = b64ToU8(recipientPubB64);
  const eph = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const pt = new TextEncoder().encode(JSON.stringify(obj));
  const ct = nacl.box(pt, nonce, recipientPk, eph.secretKey);
  const envelope = {
    v: 1,
    epk: u8ToB64(eph.publicKey),
    n: u8ToB64(nonce),
    ct: u8ToB64(ct),
  };
  return btoa(JSON.stringify(envelope));
}

/**
 * Encrypt audit receipt for sender (so sender can later decrypt for audit proof generation)
 * Uses sender's own encryption public key (derived from their identity)
 * 
 * @param senderPubB64 - Sender's encryption public key (base64)
 * @param auditReceipt - Audit receipt object containing note preimage:
 *   - amount
 *   - tokenId
 *   - memo
 *   - randomness
 *   - cipherPayPubKey (recipient's ownerCipherPayPubKey)
 *   - commitment (optional but convenient)
 * @returns base64-encoded encrypted audit receipt
 */
export function encryptForSender(senderPubB64: string, auditReceipt: unknown): string {
  const senderPk = b64ToU8(senderPubB64);
  const eph = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const pt = new TextEncoder().encode(JSON.stringify(auditReceipt));
  const ct = nacl.box(pt, nonce, senderPk, eph.secretKey);
  const envelope = {
    v: 1,
    epk: u8ToB64(eph.publicKey),
    n: u8ToB64(nonce),
    ct: u8ToB64(ct),
  };
  return btoa(JSON.stringify(envelope));
}

/**
 * Decrypt audit receipt (for sender to retrieve their own audit receipts)
 * Uses sender's own encryption secret key (derived from their identity)
 * 
 * @param ciphertextB64 - Base64-encoded encrypted audit receipt
 * @returns Decrypted audit receipt object, or null if decryption fails
 */
export function decryptAuditReceipt(ciphertextB64: string): any | null {
  try {
    const decoded = atob(ciphertextB64);
    const env = JSON.parse(decoded) as {
      v: number;
      epk: string;
      n: string;
      ct: string;
    };

    if (env.v !== 1) {
      console.warn('[e2ee] decryptAuditReceipt: Unsupported envelope version:', env.v);
      return null;
    }

    const kp = ensureValidKeypair();
    const myPk = b64ToU8(kp.publicKeyB64);
    const mySk = b64ToU8(kp.secretKeyB64);
    const epk = b64ToU8(env.epk);
    const nonce = b64ToU8(env.n);
    const ct = b64ToU8(env.ct);

    const pt = nacl.box.open(ct, nonce, epk, mySk);
    if (!pt) {
      console.warn('[e2ee] decryptAuditReceipt: Decryption failed (wrong key or corrupted data)');
      return null;
    }

    const json = new TextDecoder().decode(pt);
    return JSON.parse(json);
  } catch (e) {
    console.error('[e2ee] decryptAuditReceipt: Error:', e);
    return null;
  }
}

export function decryptFromSenderForMe(ciphertextB64: string): any | null {
  try {
    const decoded = atob(ciphertextB64);
    
    const env = JSON.parse(decoded) as {
      v: number;
      epk: string;
      n: string;
      ct: string;
    };
    
    if (!env || env.v !== 1) {
      console.warn('[e2ee] Invalid envelope version or missing envelope');
      return null;
    }

    const epk = b64ToU8(env.epk);
    const nonce = b64ToU8(env.n);
    const ct = b64ToU8(env.ct);
    

    const keypair = getOrCreateLocalEncKeypair();
    const skB64 = keypair.secretKeyB64;
    const sk = b64ToU8(skB64);
    
    const pt = nacl.box.open(ct, nonce, epk, sk);
    if (!pt) {
      console.error('[e2ee] nacl.box.open returned null - decryption failed');
      return null;
    }

    const result = JSON.parse(new TextDecoder().decode(pt));
    return result;
  } catch (error) {
    console.error('[e2ee] Error during decryption:', error);
    console.error('[e2ee] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return null;
  }
}
