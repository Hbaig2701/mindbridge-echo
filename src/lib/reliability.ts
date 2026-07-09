// Every external call (Anthropic, OpenAI, Supabase) is wrapped with a timeout and
// a single retry. Callers decide the friendly fallback.

export class ExternalCallError extends Error {
  constructor(
    public readonly label: string,
    public readonly cause: unknown,
  ) {
    super(`External call failed: ${label}`);
    this.name = 'ExternalCallError';
  }
}

interface WithRetryOptions {
  label: string;
  timeoutMs?: number;
  retries?: number; // additional attempts after the first (spec: one retry)
}

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Run `fn` with a timeout and one retry. Throws ExternalCallError on final failure
 * so callers can render a friendly, recoverable message.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { label, timeoutMs = 20_000, retries = 1 }: WithRetryOptions,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await timeout(fn(), timeoutMs, label);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await wait(300 * (attempt + 1));
      }
    }
  }
  console.error(`[reliability] ${label} failed after ${retries + 1} attempts:`, lastErr);
  throw new ExternalCallError(label, lastErr);
}
