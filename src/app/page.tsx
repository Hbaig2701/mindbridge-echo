import Link from 'next/link';
import { getUser } from '@/lib/auth';

// Public landing / vision screen. Plain-language "what Echo is and who it helps".
export default async function Landing() {
  const user = await getUser();

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold text-[var(--brand)]">MindBridge Echo</span>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <Link
              href="/caregiver"
              className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-fg)]"
            >
              Open app
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 font-medium">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-[var(--brand)] px-4 py-2 font-medium text-[var(--brand-fg)]"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-10 pb-16 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
          A research pilot — a companion, not a medical device
        </p>
        <h1 className="text-3xl font-bold leading-tight text-[var(--foreground)] sm:text-4xl">
          A warm companion for your loved one — and a real break for you.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-[var(--muted)]">
          MindBridge Echo gently engages a person living with dementia in familiar,
          personalized conversation drawn from their own life — their family, their work,
          the music and places they love. When you need a moment, hand over the device and
          Echo keeps them calm, talking, and connected.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={user ? '/caregiver' : '/signup'}
            className="rounded-lg bg-[var(--brand)] px-6 py-3 text-base font-semibold text-[var(--brand-fg)]"
          >
            {user ? 'Open app' : 'Start the pilot'}
          </Link>
          {!user && (
            <Link
              href="/login"
              className="rounded-lg border border-[var(--border)] bg-white px-6 py-3 text-base font-semibold"
            >
              I have an account
            </Link>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-5 px-6 pb-20 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">For the person with dementia</h2>
          <p className="mt-2 text-[var(--muted)]">
            Calm, dignified connection in moments that would otherwise be frightening or
            lonely — meeting them where they are, never correcting, never arguing with their
            reality.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <h2 className="text-lg font-semibold">For the caregiver</h2>
          <p className="mt-2 text-[var(--muted)]">
            Real, verified breaks — whether you care for family at home or many residents in a
            facility. Track what settles your person, and watch calm and respite grow over
            time.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-6 text-center text-sm text-[var(--muted)]">
        A companion tool, not for emergencies — call 911 for emergencies. Use fictional or
        de-identified details during the pilot.
      </footer>
    </main>
  );
}
