const FIREBASE_ADMIN_CLIENT_EMAIL = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const FIREBASE_ADMIN_PRIVATE_KEY = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export function getAdminConfig(): FirebaseAdminConfig {
  if (!FIREBASE_ADMIN_CLIENT_EMAIL || !FIREBASE_ADMIN_PRIVATE_KEY || !FIREBASE_PROJECT_ID) {
    throw new Error(
      'Firebase Admin SDK credentials not configured. Set FIREBASE_ADMIN_CLIENT_EMAIL, ' +
        'FIREBASE_ADMIN_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local'
    );
  }
  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

export async function verifyFirebaseToken(token: string): Promise<{ uid: string; email?: string } | null> {
  try {
    const config = getAdminConfig();
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const user = data.users?.[0];
    if (!user) return null;
    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}

export async function callFirebaseFunction(
  functionName: string,
  data: Record<string, unknown>
): Promise<unknown> {
  const config = getAdminConfig();
  const url = `https://cloudfunctions.googleapis.com/v2/projects/${config.projectId}/locations/us-central1/functions/${functionName}:call`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data }),
  });
  if (!response.ok) {
    throw new Error(`Firebase Function ${functionName} failed: ${response.statusText}`);
  }
  return response.json();
}
