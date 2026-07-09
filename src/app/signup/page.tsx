import Link from 'next/link';
import { SignupForm } from './SignupForm';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold text-[var(--brand)]">
            MindBridge Echo
          </Link>
          <h1 className="mt-4 text-2xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Join the research pilot. A companion for your loved one — and a break for you.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
          <SignupForm />
        </div>
        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Research pilot only — not a medical device, not for emergencies.
        </p>
      </div>
    </main>
  );
}
