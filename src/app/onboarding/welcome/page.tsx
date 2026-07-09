import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser, getConsent } from '@/lib/auth';
import { Button } from '@/components/ui';

export default async function WelcomePage() {
  const user = await requireUser();
  const consent = await getConsent(user.id);
  if (consent?.agreed) redirect('/caregiver');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
        Welcome to the pilot
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
        A warm companion for your loved one — and a real break for you.
      </h1>

      <div className="mt-6 space-y-4 text-lg text-[var(--muted)]">
        <p>
          Caring for someone living with dementia can be tender, exhausting, and lonely — often all
          at once. In hard moments, what settles a person is being met where they are: in familiar,
          personalized conversation drawn from their own life, their family, their work, the music
          and places they love.
        </p>
        <p>
          MindBridge Echo does exactly that. You build a picture of the person you care for, then
          hand them the device when you need a moment. Echo keeps them calm, talking, and connected —
          never correcting, never arguing with their reality — while you catch your breath.
        </p>
        <p>
          This is a research pilot built with clinical care in mind. It is a companion, not a medical
          device, and not for emergencies. Over the next few steps we&apos;ll set up your account and
          create your first profile.
        </p>
      </div>

      <div className="mt-8">
        <Link href="/onboarding/role">
          <Button size="lg" className="w-full sm:w-auto">
            Continue
          </Button>
        </Link>
      </div>
    </main>
  );
}
