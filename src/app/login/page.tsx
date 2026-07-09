import Link from 'next/link';
import { Alert } from '@/components/ui';
import { LoginForm } from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; reset?: string }>;
}) {
  const { redirect, error, reset } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold text-[var(--brand)]">
            MindBridge Echo
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Log in to continue caring with Echo.</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          {reset === 'success' && (
            <div className="mb-4">
              <Alert tone="success">Your password was updated. Please log in with it.</Alert>
            </div>
          )}
          <LoginForm redirect={redirect} initialError={error} />
        </div>
      </div>
    </main>
  );
}
