export interface Env {
  FIREBASE_ADMIN_CLIENT_EMAIL: string;
  FIREBASE_ADMIN_PRIVATE_KEY: string;
  FIREBASE_PROJECT_ID: string;
  API_KEY: string;
  ALLOWED_ORIGIN: string;
  QUORUM_PAYMENTS_URL: string;
  QUORUM_COMM_URL: string;
  CRON_SECRET: string;
  APP_URL: string;
}

export function generateCorrelationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function jsonResp(data: unknown, status = 200, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || '*',
    },
  });
}

export function errorResp(message: string, status = 500, env?: Env): Response {
  return jsonResp({ error: message }, status, env);
}

// Firebase Auth — verify Firebase ID tokens via JWKS
interface JwtHeader { alg: string; kid?: string; typ: string; }
interface JwtPayload { iss?: string; sub?: string; aud?: string; exp?: number; iat?: number; email?: string; user_id?: string; [key: string]: unknown; }

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function verifyFirebaseToken(token: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0]))) as JwtHeader;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as JwtPayload;

    if (header.alg !== 'RS256') return null;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    const projectId = process.env.FIREBASE_PROJECT_ID || 'agaseke4org';
    if (payload.aud !== projectId) return null;

    const certRes = await fetch(`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`);
    if (!certRes.ok) return null;
    const certs = await certRes.json() as Record<string, string>;

    const certPem = certs[header.kid || ''];
    if (!certPem) return null;

    const certDer = pemToDer(certPem);
    const publicKey = await crypto.subtle.importKey(
      'spki', certDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
    );

    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecode(parts[2]);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, data);
    if (!valid) return null;

    return payload;
  } catch {
    return null;
  }
}

// Firebase Admin REST API helpers
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

export async function getFirebaseAccessToken(email: string, privateKey: string): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: expiry,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedClaimSet = btoa(JSON.stringify(claimSet)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signatureInput));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Firebase token request failed: ${tokenRes.status} ${errText.slice(0, 300)}`);
  }

  const tokenData = await tokenRes.json();
  cachedAccessToken = { token: tokenData.access_token, expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000 };
  return tokenData.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const cleaned = pem.replace(/-----BEGIN PRIVATE KEY-----/g, '').replace(/-----END PRIVATE KEY-----/g, '').replace(/\s/g, '');
  const binaryString = atob(cleaned);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Firestore REST API helpers
export async function firestoreGet(collection: string, docId: string, accessToken: string, projectId: string): Promise<Record<string, unknown> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const doc = await res.json();
  return firestoreDocToData(doc);
}

export async function firestoreQuery(
  collection: string,
  field: string,
  value: string,
  accessToken: string,
  projectId: string
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
      },
    }),
  });

  if (!res.ok) return [];
  const results = await res.json();
  return results
    .filter((r: Record<string, unknown>) => r.document)
    .map((r: Record<string, unknown>) => {
      const doc = r.document as Record<string, unknown>;
      const name = doc.name as string;
      const id = name.split('/').pop() || '';
      return { id, ...firestoreDocToData(doc) };
    });
}

export async function firestoreQueryComposite(
  collection: string,
  filters: Array<{ field: string; value: string }>,
  accessToken: string,
  projectId: string
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const where = filters.length === 1
    ? { fieldFilter: { field: { fieldPath: filters[0].field }, op: 'EQUAL', value: { stringValue: filters[0].value } } }
    : { compositeFilter: { op: 'AND', filters: filters.map(f => ({ fieldFilter: { field: { fieldPath: f.field }, op: 'EQUAL', value: { stringValue: f.value } } })) } };

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collection }],
        where,
      },
    }),
  });

  if (!res.ok) return [];
  const results = await res.json();
  return results
    .filter((r: Record<string, unknown>) => r.document)
    .map((r: Record<string, unknown>) => {
      const doc = r.document as Record<string, unknown>;
      const name = doc.name as string;
      const id = name.split('/').pop() || '';
      return { id, ...firestoreDocToData(doc) };
    });
}

export async function firestoreUpdate(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  accessToken: string,
  projectId: string
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else {
      fields[key] = { stringValue: String(value) };
    }
  }

  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

export async function firestoreCreate(
  collection: string,
  data: Record<string, unknown>,
  accessToken: string,
  projectId: string
): Promise<string | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}`;
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      fields[key] = { doubleValue: value };
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    } else {
      fields[key] = { stringValue: String(value) };
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) return null;
  const doc = await res.json();
  const name = doc.name as string;
  return name.split('/').pop() || null;
}

function firestoreDocToData(doc: Record<string, unknown>): Record<string, unknown> {
  const fields = doc.fields as Record<string, Record<string, unknown>> | undefined;
  if (!fields) return {};
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(fields)) {
    if ('stringValue' in field) result[key] = field.stringValue;
    else if ('integerValue' in field) result[key] = Number(field.integerValue);
    else if ('doubleValue' in field) result[key] = field.doubleValue;
    else if ('booleanValue' in field) result[key] = field.booleanValue;
    else if ('timestampValue' in field) result[key] = field.timestampValue;
    else if ('nullValue' in field) result[key] = null;
    else if ('arrayValue' in field) {
      const vals = (field.arrayValue as { values?: Record<string, unknown>[] }).values || [];
      result[key] = vals.map((v) => ('stringValue' in v ? v.stringValue : v));
    }
  }
  return result;
}
