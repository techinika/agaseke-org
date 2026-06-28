import crypto from 'crypto';
import { getAdminConfig } from './admin';

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

function getHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; timestampValue?: string }>;
  createTime?: string;
  updateTime?: string;
}

type FirestoreFieldValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
};

function decodeFields(fields?: Record<string, FirestoreFieldValue>): Record<string, unknown> {
  if (!fields) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue, 10);
    else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.timestampValue !== undefined) result[key] = value.timestampValue;
  }
  return result;
}

function toFirestoreFields(data: Record<string, unknown>): Record<string, FirestoreFieldValue> {
  const fields: Record<string, FirestoreFieldValue> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    }
  }
  return fields;
}

// --- OAuth2 token management ---

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const config = getAdminConfig();

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: config.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${base64Header}.${base64Payload}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), config.privateKey);
  const jwt = `${signingInput}.${signature.toString('base64url')}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get OAuth2 token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return tokenCache.token;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// --- Firestore document path builder ---

function docPath(projectId: string, collection: string, docId: string, subcollection?: string, subDocId?: string): string {
  let path = `projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
  if (subcollection && subDocId) {
    path += `/${subcollection}/${subDocId}`;
  }
  return path;
}

// --- Server-side Firestore operations ---

export async function readFirestoreDocument(collection: string, docId: string, subcollection?: string, subDocId?: string): Promise<Record<string, unknown> | null> {
  try {
    const config = getAdminConfig();
    const headers = await getAuthHeaders();
    const path = docPath(config.projectId, collection, docId, subcollection, subDocId);
    const url = `${FIRESTORE_BASE}/${encodeURI(path)}`;

    const response = await fetch(url, { headers });
    if (response.status === 404) return null;
    if (!response.ok) {
      console.error(`Firestore read failed: ${response.status} for ${collection}/${docId}`);
      return null;
    }

    const data = await response.json();
    return { id: data.name.split('/').pop(), ...decodeFields(data.fields) };
  } catch (err) {
    console.error(`Firestore read error for ${collection}/${docId}:`, err);
    return null;
  }
}

export async function updateFirestoreDocument(
  collection: string,
  docId: string,
  data: Record<string, unknown>,
  subcollection?: string,
  subDocId?: string
): Promise<void> {
  const config = getAdminConfig();
  const headers = await getAuthHeaders();
  const path = docPath(config.projectId, collection, docId, subcollection, subDocId);
  const fieldPaths = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${FIRESTORE_BASE}/${encodeURI(path)}?${fieldPaths}`;

  const fields = toFirestoreFields(data);

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore update failed: ${response.status} ${errorText}`);
  }
}

export async function queryFirestoreDocuments(
  collection: string,
  field: string,
  operator: string,
  value: string | number | boolean,
  limit?: number
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const config = getAdminConfig();
  const headers = await getAuthHeaders();

  let fieldValue: { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean };
  if (typeof value === 'string') {
    fieldValue = { stringValue: value };
  } else if (typeof value === 'number') {
    fieldValue = Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  } else {
    fieldValue = { booleanValue: value };
  }

  const query: Record<string, unknown> = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: operator,
          value: fieldValue,
        },
      },
    },
  };

  if (limit) {
    (query.structuredQuery as Record<string, unknown>).limit = limit;
  }

  const url = `${FIRESTORE_BASE}/projects/${config.projectId}/databases/(default)/documents:runQuery`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`Firestore query failed: ${response.status}`);
  }

  const results = await response.json();
  return results
    .filter((r: Record<string, unknown>) => r.document)
    .map((r: Record<string, unknown>) => {
      const doc = r.document as FirestoreDocument;
      const id = doc.name.split('/').pop() || '';
      return { id, ...decodeFields(doc.fields) } as Record<string, unknown> & { id: string };
    });
}

export async function incrementFirestoreField(
  collection: string,
  docId: string,
  field: string,
  amount: number,
  subcollection?: string,
  subDocId?: string
): Promise<void> {
  const config = getAdminConfig();
  const headers = await getAuthHeaders();
  const path = docPath(config.projectId, collection, docId, subcollection, subDocId);

  const commitUrl = `${FIRESTORE_BASE}/projects/${config.projectId}/databases/(default)/documents:commit`;

  const response = await fetch(commitUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      writes: [
        {
          transform: {
            document: path,
            fieldTransforms: [
              {
                fieldPath: field,
                increment: { integerValue: String(amount) },
              },
            ],
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firestore atomic increment failed: ${response.status} ${errorText}`);
  }
}

export async function fetchOrgBySlug(slug: string): Promise<{ id: string; name: string; description: string; category: string; country: string; logoURL?: string; coverURL?: string } | null> {
  try {
    const config = getAdminConfig();
    const url = `${FIRESTORE_BASE}/projects/${config.projectId}/databases/(default)/documents:runQuery`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'organizations' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'slug' },
            op: 'EQUAL',
            value: { stringValue: slug },
          },
        },
        limit: 1,
      },
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`fetchOrgBySlug: Firestore query failed with status ${response.status}`);
      return null;
    }
    const data = await response.json();
    const doc = data?.[0]?.document as FirestoreDocument | undefined;
    if (!doc) return null;
    const id = doc.name.split('/').pop() || '';
    const fields = decodeFields(doc.fields);
    return {
      id,
      name: (fields.name as string) || '',
      description: (fields.description as string) || '',
      category: (fields.category as string) || '',
      country: (fields.country as string) || '',
      logoURL: fields.logoURL as string | undefined,
      coverURL: fields.coverURL as string | undefined,
    };
  } catch (err) {
    console.error('fetchOrgBySlug error:', err);
    return null;
  }
}
