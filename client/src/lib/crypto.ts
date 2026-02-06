/**
 * Client Crypto Layer - Phase 1: 단순 shared key 암복호화
 */

/**
 * 랜덤 키 생성 (32 bytes)
 */
export function generateRoomKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * 메시지 암호화 (AES-GCM)
 */
export async function encryptMessage(
  message: string,
  key: Uint8Array
): Promise<{ ciphertext: string; nonce: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  // Nonce 생성 (12 bytes for GCM)
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // 키 import
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // 암호화
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
    },
    cryptoKey,
    data
  );

  // Base64로 인코딩
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    nonce: arrayBufferToBase64(nonce),
  };
}

/**
 * 메시지 복호화
 */
export async function decryptMessage(
  ciphertext: string,
  nonce: string,
  key: Uint8Array
): Promise<string> {
  // 입력 검증
  if (!ciphertext || !nonce) {
    throw new Error("Missing ciphertext or nonce");
  }

  if (!key || key.length !== 32) {
    throw new Error(`Invalid key length: expected 32, got ${key?.length || 0}`);
  }

  try {
    const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
    const nonceBuffer = base64ToArrayBuffer(nonce);

    if (nonceBuffer.length !== 12) {
      throw new Error(`Invalid nonce length: expected 12, got ${nonceBuffer.length}`);
    }

    if (ciphertextBuffer.byteLength === 0) {
      throw new Error("Empty ciphertext");
    }

    // 키 import
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-GCM" },
      false,
      ["decrypt"]
    );

    // 복호화
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonceBuffer,
      },
      cryptoKey,
      ciphertextBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error: any) {
    // 더 자세한 에러 정보 제공
    const errorMsg = error.message || error.toString() || "Unknown decryption error";
    throw new Error(`Decryption failed: ${errorMsg}`);
  }
}

/**
 * Base64 <-> ArrayBuffer 유틸
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 키를 Base64 문자열로 변환 (저장용)
 */
export function keyToBase64(key: Uint8Array): string {
  return arrayBufferToBase64(key.buffer);
}

/**
 * Base64 문자열을 키로 변환
 */
export function base64ToKey(base64: string): Uint8Array {
  const buffer = base64ToArrayBuffer(base64);
  return new Uint8Array(buffer);
}

