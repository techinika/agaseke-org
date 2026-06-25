const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

interface UploadResult {
  url: string;
  fileId: string;
  thumbnailUrl: string;
}

interface AuthParams {
  signature: string;
  token: string;
  expire: number;
}

async function getAuthParams(): Promise<AuthParams | null> {
  try {
    const response = await fetch('/api/imagekit/auth');
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function getImageKitUrl(path: string, transformations?: Record<string, string>): string {
  if (!IMAGEKIT_URL_ENDPOINT) return path;
  const base = `${IMAGEKIT_URL_ENDPOINT}/${path}`;
  if (!transformations) return base;
  const params = Object.entries(transformations)
    .map(([k, v]) => `${k}-${v}`)
    .join(',');
  return `${IMAGEKIT_URL_ENDPOINT}/${params}/${path}`;
}

export async function uploadToImageKit(
  file: File,
  fileName: string,
  folder?: string
): Promise<UploadResult> {
  const authParams = await getAuthParams();
  if (!authParams && !IMAGEKIT_PUBLIC_KEY) {
    throw new Error('ImageKit not configured');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', fileName);
  if (folder) formData.append('folder', folder);
  formData.append('publicKey', IMAGEKIT_PUBLIC_KEY ?? '');
  formData.append('useUniqueFileName', 'true');

  if (authParams) {
    formData.append('signature', authParams.signature);
    formData.append('token', authParams.token);
    formData.append('expire', String(authParams.expire));
  }

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Image upload failed');
  }

  const data = await response.json();
  return {
    url: data.url,
    fileId: data.fileId,
    thumbnailUrl: data.thumbnailUrl,
  };
}

export function getImageUrl(
  fileId: string,
  width?: number,
  height?: number
): string {
  if (!IMAGEKIT_URL_ENDPOINT) return '';
  let path = `${IMAGEKIT_URL_ENDPOINT}/${fileId}`;
  const transforms: string[] = [];
  if (width) transforms.push(`w-${width}`);
  if (height) transforms.push(`h-${height}`);
  if (transforms.length > 0) path = `${IMAGEKIT_URL_ENDPOINT}/tr:${transforms.join(',')}/${fileId}`;
  return path;
}
