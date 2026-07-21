import { verifyFirebaseToken, getBearerToken } from '../../shared/firebase-auth';

interface Env {
  R2_BUCKET: R2Bucket;
  FIREBASE_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGIN: string;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'quorum-org-app.vercel.app',
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (method === 'POST' && url.pathname === '/upload') {
      return handleUpload(request, env);
    }

    if (method === 'GET' && url.pathname.startsWith('/files/')) {
      return handleGet(request, env);
    }

    if (method === 'DELETE' && url.pathname.startsWith('/files/')) {
      return handleDelete(request, env);
    }

    return jsonResp({ error: 'Not found' }, 404, env);
  },
};

async function requireAuth(request: Request, env: Env): Promise<{ uid: string; email?: string } | null> {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
}

async function handleUpload(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return jsonResp({ error: 'Unauthorized' }, 401, env);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'general';

    if (!file) {
      return jsonResp({ error: 'No file provided' }, 400, env);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return jsonResp({ error: 'Invalid file type. Allowed: PNG, JPG, GIF, WebP, SVG' }, 400, env);
    }

    if (file.size > MAX_SIZE) {
      return jsonResp({ error: 'File too large. Maximum size is 5MB' }, 400, env);
    }

    const ext = file.name.split('.').pop() || 'bin';
    const key = `${folder}/${crypto.randomUUID()}.${ext}`;

    await env.R2_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const url = `${new URL(request.url).origin}/files/${key}`;

    return jsonResp({ url, key }, 200, env);
  } catch (err) {
    console.error('upload error', err);
    return jsonResp({ error: 'Upload failed' }, 500, env);
  }
}

async function handleGet(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace('/files/', ''));

    const object = await env.R2_BUCKET.get(key);
    if (!object) {
      return jsonResp({ error: 'File not found' }, 404, env);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN || '*');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('get error', err);
    return jsonResp({ error: 'Failed to retrieve file' }, 500, env);
  }
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  try {
    const auth = await requireAuth(request, env);
    if (!auth) {
      return jsonResp({ error: 'Unauthorized' }, 401, env);
    }

    const url = new URL(request.url);
    const key = decodeURIComponent(url.pathname.replace('/files/', ''));

    await env.R2_BUCKET.delete(key);
    return jsonResp({ success: true }, 200, env);
  } catch (err) {
    console.error('delete error', err);
    return jsonResp({ error: 'Failed to delete file' }, 500, env);
  }
}

function jsonResp(data: unknown, status = 200, env?: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': env?.ALLOWED_ORIGIN || '*',
    },
  });
}
