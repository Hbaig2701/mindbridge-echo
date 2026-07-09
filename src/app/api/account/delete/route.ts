// Delete-my-data. Removes the user's auth account; all owned rows cascade via the
// on-delete-cascade foreign keys. Requires the service role (admin) to delete the
// auth user, but only ever acts on the currently authenticated caller's own id.

import { NextResponse } from 'next/server';
import { getAuthedContext, isResponse } from '@/lib/apiAuth';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST() {
  const ctx = await getAuthedContext();
  if (isResponse(ctx)) return ctx;
  const { supabase, user } = ctx;

  // Sign the user out of this session first.
  await supabase.auth.signOut();

  // Delete the auth user (cascades to all owned rows).
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error('[api/account/delete] failed:', error);
    return NextResponse.json({ error: 'Could not delete account' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
