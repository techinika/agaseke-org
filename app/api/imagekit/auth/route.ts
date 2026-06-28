import { NextResponse } from 'next/server';
import crypto from 'crypto';

const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;

export async function GET() {
  if (!IMAGEKIT_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'ImageKit private key not configured' },
      { status: 500 }
    );
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + 60 * 30;
  const signature = crypto
    .createHmac('sha1', IMAGEKIT_PRIVATE_KEY)
    .update(token + expire)
    .digest('hex');

  const response = NextResponse.json({
    signature,
    token,
    expire,
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Cache-Control', 'no-store, max-age=0');

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}