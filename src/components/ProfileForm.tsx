'use client';

// Shared guided intake form for care-recipient profiles. Owned by the caregiver
// cluster; imported by others. Covers the full life_story shape plus name, age,
// known triggers and calming strategies. Long-text fields carry a MicButton so a
// caregiver can dictate rather than type. Create (POST) when `initial` is null,
// update (PUT) otherwise.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, Input, Label, Textarea } from '@/components/ui';
import { MicButton } from '@/components/MicButton';
import { emptyLifeStory, type LifeStory, type FamilyMember, type Profile } from '@/lib/types';

type Props = {
  initial?: Profile | null;
  submitLabel?: string;
  redirectTo?: string;
};

// Merge a possibly-partial stored life story over the empty default so every
// field is defined and controlled.
function mergeLifeStory(initial?: Profile | null): LifeStory {
  const base = emptyLifeStory();
  const s = initial?.life_story;
  if (!s) return base;
  return {
    background: {
      birthplace: s.background?.birthplace ?? base.background.birthplace,
      upbringing: s.background?.upbringing ?? base.background.upbringing,
      languages: s.background?.languages ?? base.background.languages,
    },
    family: Array.isArray(s.family) ? s.family : base.family,
    work: {
      occupation: s.work?.occupation ?? base.work.occupation,
      career_notes: s.work?.career_notes ?? base.work.career_notes,
    },
    interests: s.interests ?? base.interests,
    music: s.music ?? base.music,
    comfort_topics: s.comfort_topics ?? base.comfort_topics,
    key_people: s.key_people ?? base.key_people,
    important_places: s.important_places ?? base.important_places,
    routines: s.routines ?? base.routines,
    communication_notes: s.communication_notes ?? base.communication_notes,
  };
}

// A small add-as-you-go list of short strings (chips).
function TagList({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...values, v]);
    setDraft('');
  };
  return (
    <div>
      <Label>{label}</Label>
      {hint && <p className="mb-1 text-xs text-[var(--muted)]">{hint}</p>}
      {values.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((v, i) => (
            <li
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm text-[var(--brand)]"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((_, j) => j !== i))}
                className="text-[var(--brand)] hover:opacity-70"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type and press Add"
        />
        <Button type="button" variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
    </div>
  );
}

// A long-text field with a dictation button that appends transcribed speech.
function VoiceTextarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <Label className="mb-0">{label}</Label>
        <MicButton
          size="sm"
          idleLabel="Dictate"
          onTranscript={(text) => onChange(value ? `${value} ${text}` : text)}
        />
      </div>
      <Textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export function ProfileForm({ initial, submitLabel = 'Save profile', redirectTo }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? '');
  const [age, setAge] = useState<string>(initial?.age != null ? String(initial.age) : '');
  const [story, setStory] = useState<LifeStory>(() => mergeLifeStory(initial));
  const [triggers, setTriggers] = useState<string[]>(initial?.known_triggers ?? []);
  const [strategies, setStrategies] = useState<string[]>(
    initial?.known_calming_strategies ?? [],
  );

  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Helpers to update nested life_story slices immutably.
  const setBackground = (patch: Partial<LifeStory['background']>) =>
    setStory((s) => ({ ...s, background: { ...s.background, ...patch } }));
  const setWork = (patch: Partial<LifeStory['work']>) =>
    setStory((s) => ({ ...s, work: { ...s.work, ...patch } }));

  const addFamily = () =>
    setStory((s) => ({ ...s, family: [...s.family, { name: '', relationship: '', notes: '' }] }));
  const updateFamily = (i: number, patch: Partial<FamilyMember>) =>
    setStory((s) => ({
      ...s,
      family: s.family.map((m, j) => (j === i ? { ...m, ...patch } : m)),
    }));
  const removeFamily = (i: number) =>
    setStory((s) => ({ ...s, family: s.family.filter((_, j) => j !== i) }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNameError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('A name is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        age: age.trim() === '' ? null : Number(age),
        life_story: story,
        known_triggers: triggers,
        known_calming_strategies: strategies,
      };

      const res = await fetch('/api/profiles', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initial ? { id: initial.id, ...payload } : payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Could not save the profile. Please try again.');
        setSaving(false);
        return;
      }

      router.push(redirectTo ?? '/caregiver');
      router.refresh();
    } catch {
      setError('Something went wrong. Please check your connection and try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}

      {/* Basics */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">The basics</h2>
        <div>
          <Label htmlFor="pf-name">Name *</Label>
          <Input
            id="pf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Margaret"
            aria-invalid={!!nameError}
          />
          {nameError && <p className="mt-1 text-sm text-[var(--danger)]">{nameError}</p>}
        </div>
        <div>
          <Label htmlFor="pf-age">Age</Label>
          <Input
            id="pf-age"
            type="number"
            min={0}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Optional"
            className="max-w-32"
          />
        </div>
      </Card>

      {/* Background */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Background</h2>
        <div>
          <Label htmlFor="pf-birthplace">Birthplace</Label>
          <Input
            id="pf-birthplace"
            value={story.background.birthplace}
            onChange={(e) => setBackground({ birthplace: e.target.value })}
            placeholder="Where were they born?"
          />
        </div>
        <VoiceTextarea
          label="Upbringing"
          value={story.background.upbringing}
          onChange={(v) => setBackground({ upbringing: v })}
          placeholder="Childhood, family they grew up in, formative memories…"
        />
        <TagList
          label="Languages"
          hint="Languages they speak or feel most at home in."
          values={story.background.languages}
          onChange={(languages) => setBackground({ languages })}
        />
      </Card>

      {/* Family */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Family</h2>
          <Button type="button" variant="secondary" onClick={addFamily}>
            Add family member
          </Button>
        </div>
        {story.family.length === 0 && (
          <p className="text-sm text-[var(--muted)]">No family members added yet.</p>
        )}
        <div className="space-y-4">
          {story.family.map((m, i) => (
            <div key={i} className="rounded-lg border border-[var(--border)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--muted)]">
                  Family member {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeFamily(i)}
                  className="text-sm text-[var(--danger)] hover:opacity-70"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={m.name}
                    onChange={(e) => updateFamily(i, { name: e.target.value })}
                    placeholder="e.g. David"
                  />
                </div>
                <div>
                  <Label>Relationship</Label>
                  <Input
                    value={m.relationship}
                    onChange={(e) => updateFamily(i, { relationship: e.target.value })}
                    placeholder="e.g. Son"
                  />
                </div>
              </div>
              <VoiceTextarea
                label="Notes"
                value={m.notes}
                onChange={(v) => updateFamily(i, { notes: v })}
                rows={2}
                placeholder="What matters about this relationship?"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Work */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Work &amp; career</h2>
        <div>
          <Label htmlFor="pf-occupation">Occupation</Label>
          <Input
            id="pf-occupation"
            value={story.work.occupation}
            onChange={(e) => setWork({ occupation: e.target.value })}
            placeholder="What did they do for work?"
          />
        </div>
        <VoiceTextarea
          label="Career notes"
          value={story.work.career_notes}
          onChange={(v) => setWork({ career_notes: v })}
          placeholder="Roles they were proud of, colleagues, achievements…"
        />
      </Card>

      {/* Interests & comfort */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Interests &amp; comfort
        </h2>
        <TagList
          label="Interests &amp; hobbies"
          values={story.interests}
          onChange={(interests) => setStory((s) => ({ ...s, interests }))}
        />
        <TagList
          label="Music they love"
          values={story.music}
          onChange={(music) => setStory((s) => ({ ...s, music }))}
        />
        <TagList
          label="Comfort topics"
          hint="Subjects that reliably soothe or delight them."
          values={story.comfort_topics}
          onChange={(comfort_topics) => setStory((s) => ({ ...s, comfort_topics }))}
        />
        <TagList
          label="Key people"
          hint="Names to recognise and speak about warmly."
          values={story.key_people}
          onChange={(key_people) => setStory((s) => ({ ...s, key_people }))}
        />
        <TagList
          label="Important places"
          values={story.important_places}
          onChange={(important_places) => setStory((s) => ({ ...s, important_places }))}
        />
        <TagList
          label="Routines"
          hint="Daily rhythms and rituals that ground them."
          values={story.routines}
          onChange={(routines) => setStory((s) => ({ ...s, routines }))}
        />
      </Card>

      {/* Communication */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Communication</h2>
        <VoiceTextarea
          label="Communication notes"
          value={story.communication_notes}
          onChange={(v) => setStory((s) => ({ ...s, communication_notes: v }))}
          placeholder="How they like to be spoken to, words to use or avoid, pacing…"
        />
      </Card>

      {/* Triggers & strategies */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Triggers &amp; what helps
        </h2>
        <TagList
          label="Known triggers"
          hint="Topics or situations that tend to cause distress."
          values={triggers}
          onChange={setTriggers}
        />
        <TagList
          label="Known calming strategies"
          hint="Approaches that reliably help them settle."
          values={strategies}
          onChange={setStrategies}
        />
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
        {saving && <span className="text-sm text-[var(--muted)]">Saving profile…</span>}
      </div>
    </form>
  );
}

export default ProfileForm;
