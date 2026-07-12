'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 600 }}>Something went wrong</h1>
            <p style={{ color: '#666', marginTop: '0.5rem' }}>{error.message || 'An unexpected error occurred.'}</p>
            <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#FF0000', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
