import { redirect } from 'next/navigation';
import { requireUser, getConsent } from '@/lib/auth';
import { Card } from '@/components/ui';
import { ConsentClient } from './ConsentClient';

export default async function ConsentPage() {
  const user = await requireUser();
  const consent = await getConsent(user.id);
  if (consent?.agreed) redirect('/caregiver');

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">Step 2 of 3</p>
      <h1 className="mt-3 text-3xl font-bold">Before we begin</h1>
      <p className="mt-2 text-[var(--muted)]">
        Please read this carefully. It explains what MindBridge Echo is, what happens to your data,
        and how to take part safely.
      </p>

      <Card className="mt-6 space-y-5 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-[var(--foreground)]">A research pilot</h2>
          <p className="mt-1 text-[var(--muted)]">
            MindBridge Echo is an early research pilot. It is <strong>not a medical device</strong>,
            it does not diagnose or treat any condition, and it is <strong>not for emergencies</strong>.
            If someone is in danger or needs urgent help, call 911 (or your local emergency number).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--foreground)]">What data we store</h2>
          <p className="mt-1 text-[var(--muted)]">
            To make the companion feel familiar, we store the profile details you enter (life story,
            interests, people, places), the conversations held with the companion, safety and quality
            signals derived from those conversations, and any progress notes you log. This lets you
            track what settles your person over time. You can delete your account and all of this data
            at any time from your account settings.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            Third-party AI providers
          </h2>
          <p className="mt-1 text-[var(--muted)]">
            To run the companion, some information is processed by trusted AI providers:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>
              <strong>Anthropic</strong> powers the conversational companion and the safety
              classifier that watches for distress or risk.
            </li>
            <li>
              <strong>OpenAI</strong> handles voice transcription (speech to text) and speech
              (text to speech) so conversations can be spoken aloud.
            </li>
          </ul>
        </section>

        <section className="rounded-lg bg-[var(--danger-soft)] p-4 text-[var(--danger)]">
          <h2 className="text-base font-semibold">Use fictional or de-identified details</h2>
          <p className="mt-1">
            Because this is a pilot and data is processed by third parties, please do{' '}
            <strong>not</strong> enter real names, addresses, phone numbers, medical record numbers,
            or other real identifiers. Use fictional or de-identified stand-ins for the person you
            care for.
          </p>
        </section>
      </Card>

      <ConsentClient caregiverType={consent?.caregiver_type ?? null} />
    </main>
  );
}
