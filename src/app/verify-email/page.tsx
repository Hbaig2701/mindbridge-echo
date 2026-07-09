import Link from 'next/link';
import { ResendButton } from './ResendButton';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-soft)] text-2xl">
          ✉️
        </div>
        <h1 className="text-2xl font-bold">Check your inbox</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {email ? (
            <>
              We sent a verification link to <span className="font-medium text-[var(--foreground)]">{email}</span>.
            </>
          ) : (
            <>We sent a verification link to your email.</>
          )}{' '}
          Click it to confirm your account, then log in.
        </p>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-left shadow-sm">
          <p className="mb-4 text-sm text-[var(--muted)]">
            Didn&apos;t get it? Check your spam folder, or resend the link below.
          </p>
          <ResendButton email={email ?? ''} />
        </div>

        <p className="mt-6 text-sm text-[var(--muted)]">
          <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </main>
  );
}
