export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL}`
    : 'http://localhost:3000';
}
