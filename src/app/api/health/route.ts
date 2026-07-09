// Env/health check (auth-gated). Reports ONLY booleans of key-presence + non-secret
// model names — never key values. Handy for confirming a deploy has all its config.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';

export async function GET() {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;

  return NextResponse.json({
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasAnthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5 (default)',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts (default)',
  });
}
