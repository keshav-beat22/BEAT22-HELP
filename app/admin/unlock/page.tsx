/**
 * The first thing anyone sees at /admin.
 *
 * Deliberately says as little as possible: no product detail, no mention of
 * how the second step authenticates, and no hint about what a valid code
 * looks like. A wrong code and a missing code produce the same message.
 */
import Link from 'next/link';

export const metadata = {
  title: 'Restricted',
  robots: { index: false, follow: false },
};

// Reads searchParams, so it renders per request rather than being prerendered.
export const dynamic = 'force-dynamic';

export default async function Unlock({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const unconfigured = !process.env.ADMIN_ACCESS_CODE;

  return (
    <div className="gate">
      <main className="gate-card">
        <p className="gate-eyebrow">Beat22</p>
        <h1>Restricted area</h1>
        <p className="gate-lead">
          This system is for authorised Beat22 staff. Access is logged, and
          every change is recorded against the person who made it.
        </p>

        {unconfigured ? (
          <p className="gate-error" role="alert">
            Access is not configured on this deployment. Set{' '}
            <code>ADMIN_ACCESS_CODE</code> in the environment and redeploy.
          </p>
        ) : (
          <form method="POST" action="/api/admin/unlock" className="gate-form">
            <label htmlFor="code">Access code</label>
            <input
              id="code"
              name="code"
              type="password"
              autoComplete="off"
              autoFocus
              required
              aria-describedby={error ? 'gate-error' : undefined}
            />
            {error ? (
              <p className="gate-error" id="gate-error" role="alert">
                That code was not accepted.
              </p>
            ) : null}
            <button type="submit">Continue</button>
          </form>
        )}

        <p className="gate-foot">
          Not what you were looking for? <Link href="/">Beat22 Help Centre</Link>
        </p>
      </main>
    </div>
  );
}
