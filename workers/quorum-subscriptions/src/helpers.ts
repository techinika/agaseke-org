import { importX509, jwtVerify } from 'jose';

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

const FIREBASE_CERTS_URI = 'https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com';

interface JwtPayload { iss?: string; sub?: string; aud?: string; exp?: number; iat?: number; email?: string; user_id?: string; [key: string]: unknown; }

let cachedKeys: { keys: ReturnType<typeof importX509>[]; fetchedAt: number } | null = null;

function extractPayload(p: Record<string, unknown>): JwtPayload {
  return p as unknown as JwtPayload;
}

export async function verifyFirebaseToken(token: string): Promise<JwtPayload | null> {
  try {
    const projectId = 'agaseke4org';

    if (!cachedKeys || Date.now() - cachedKeys.fetchedAt > 3600000) {
      const res = await fetch(FIREBASE_CERTS_URI);
      const data = await res.json() as Record<string, string>;
      cachedKeys = { keys: Object.values(data).map(k => importX509(k, 'RS256')), fetchedAt: Date.now() };
    }

    for (const keyPromise of cachedKeys.keys) {
      try {
        const key = await keyPromise;
        const { payload } = await jwtVerify(token, key, {
          issuer: `https://securetoken.google.com/${projectId}`,
          audience: projectId,
        });
        return extractPayload(payload as unknown as Record<string, unknown>);
      } catch { continue; }
    }
    return null;
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
    pemToDer(privateKey),
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

function pemToDer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '')
    .replace(/\s/g, '');
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
