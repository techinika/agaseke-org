import { importX509, jwtVerify } from 'jose';

const FIREBASE_CERTS_URI = 'https://www.googleapis.com/service_accounts/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedKeys: { keys: ReturnType<typeof importX509>[]; fetchedAt: number } | null = null;

export async function verifyFirebaseToken(token: string, projectId: string): Promise<{ uid: string; email?: string } | null> {
  try {
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
        if (payload.sub) return { uid: payload.sub, email: payload.email as string | undefined };
      } catch { continue; }
    }
    return null;
  } catch { return null; }
}

export function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
