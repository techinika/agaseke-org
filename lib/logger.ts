const LOG_COLLECTION = 'logs';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

function fmt(level: LogLevel, scope: string, message: string, data?: unknown): string {
  const ts = new Date().toISOString();
  const d = data !== undefined ? ` ${typeof data === 'string' ? data : JSON.stringify(data)}` : '';
  return `[${ts}] [${level.toUpperCase()}] [${scope}] ${message}${d}`;
}

async function writeToFirestore(level: LogLevel, scope: string, message: string, data?: unknown): Promise<void> {
  try {
    const { createFirestoreDocument } = await import('@/lib/firebase/server');
    const doc: Record<string, unknown> = {
      level,
      scope,
      message,
      timestamp: new Date().toISOString(),
    };
    if (data !== undefined) {
      doc.data = typeof data === 'string' ? data : JSON.stringify(data);
    }
    await createFirestoreDocument(LOG_COLLECTION, doc);
  } catch {
    // best-effort
  }
}

function log(level: LogLevel, scope: string, message: string, data?: unknown): void {
  const line = fmt(level, scope, message, data);
  switch (level) {
    case 'error': console.error(line); break;
    case 'warn': console.warn(line); break;
    case 'info': console.info(line); break;
    case 'debug': console.debug(line); break;
  }
  writeToFirestore(level, scope, message, data).catch(() => {});
}

export const logger = {
  error: (scope: string, message: string, data?: unknown) => log('error', scope, message, data),
  warn: (scope: string, message: string, data?: unknown) => log('warn', scope, message, data),
  info: (scope: string, message: string, data?: unknown) => log('info', scope, message, data),
  debug: (scope: string, message: string, data?: unknown) => log('debug', scope, message, data),
};
