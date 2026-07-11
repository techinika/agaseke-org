export const WORKERS = {
  payments: {
    url: process.env.QUORUM_PAYMENTS_URL || 'http://localhost:8787',
    apiKey: process.env.QUORUM_PAYMENTS_API_KEY || '',
  },
  uploads: {
    url: process.env.NEXT_PUBLIC_QUORUM_UPLOADS_URL || 'http://localhost:8788',
  },
  cron: {
    url: process.env.QUORUM_CRON_URL || 'http://localhost:8789',
  },
  comm: {
    url: process.env.QUORUM_COMM_URL || 'http://localhost:8790',
    apiKey: process.env.QUORUM_COMM_API_KEY || '',
  },
} as const;
