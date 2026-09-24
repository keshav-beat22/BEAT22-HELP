'use client';

/**
 * Last-resort boundary for errors thrown by the root layout itself.
 *
 * It replaces the whole document, so it must supply its own <html> and <body>
 * and cannot rely on globals.css having loaded — hence the inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e1e1e',
          color: '#e2e2e2',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ color: '#ffffff', fontSize: 28, margin: '0 0 12px' }}>
            Beat22 Help Centre is temporarily unavailable
          </h1>
          <p style={{ margin: '0 0 24px', color: '#b5b5b5' }}>
            Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: '#7000ff',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 22px',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: 16, fontSize: 13, color: '#8a8a8a' }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
