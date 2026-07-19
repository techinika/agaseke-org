const WORKER_API_KEY = process.env.NEXT_PUBLIC_WORKER_API_KEY || '';

export const WORKERS = {
  payments: {
    url: process.env.NEXT_PUBLIC_QUORUM_PAYMENTS_URL || process.env.QUORUM_PAYMENTS_URL || 'http://localhost:8787',
    apiKey: WORKER_API_KEY,
  },
  uploads: {
    url: process.env.NEXT_PUBLIC_QUORUM_UPLOADS_URL || 'http://localhost:8788',
  },
  cron: {
    url: process.env.QUORUM_CRON_URL || 'http://localhost:8789',
  },
  comm: {
    url: process.env.NEXT_PUBLIC_QUORUM_COMM_URL || process.env.QUORUM_COMM_URL || 'http://localhost:8790',
    apiKey: WORKER_API_KEY,
  },
  subscriptions: {
    url: process.env.NEXT_PUBLIC_QUORUM_SUBSCRIPTIONS_URL || process.env.QUORUM_SUBSCRIPTIONS_URL || 'http://localhost:8791',
    apiKey: WORKER_API_KEY,
  },
} as const;
