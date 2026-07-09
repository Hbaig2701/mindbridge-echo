// Anthropic client + a small helper for single-shot text completions.
// Server-only. Model comes from ANTHROPIC_MODEL (default claude-sonnet-5).

import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '@/lib/reliability';

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY');
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
}

export interface CompletionArgs {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  temperature?: number;
  label: string;
}

/** Single-shot completion returning concatenated text, wrapped in timeout+retry. */
export async function complete({
  system,
  messages,
  maxTokens = 700,
  temperature = 0.7,
  label,
}: CompletionArgs): Promise<string> {
  const res = await withRetry(
    () =>
      anthropic().messages.create({
        model: anthropicModel(),
        max_tokens: maxTokens,
        temperature,
        system,
        messages,
      }),
    { label, timeoutMs: 30_000 },
  );

  return res.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}
