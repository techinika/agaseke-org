const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(roomId: string, userId: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(roomId + userId + 'agaseke-chat-key-v1'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('agaseke-chat-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptMessage(
  content: string,
  roomId: string,
  userId: string
): Promise<string> {
  try {
    const key = await getKey(roomId, userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = encoder.encode(content);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch {
    return content;
  }
}

export async function decryptMessage(
  encryptedContent: string,
  roomId: string,
  userId: string
): Promise<string> {
  try {
    const key = await getKey(roomId, userId);
    const combined = new Uint8Array(
      atob(encryptedContent)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return decoder.decode(decrypted);
  } catch {
    return encryptedContent;
  }
}

export async function generateRoomKey(roomId: string): Promise<string> {
  const key = await getKey(roomId, 'system');
  const exported = await crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}
