// Guards against open-redirects. Only same-origin, absolute-path targets are allowed
// (e.g. "/caregiver"). Rejects protocol-relative ("//evil.com"), backslash tricks
// ("/\\evil.com"), and absolute URLs ("https://evil.com").
export function safeInternalPath(
  path: string | null | undefined,
  fallback: string,
): string {
  if (!path) return fallback;
  // Must start with a single "/" not followed by "/" or "\".
  if (/^\/(?![/\\])/.test(path)) return path;
  return fallback;
}
