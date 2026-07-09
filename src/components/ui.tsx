// Small shared UI kit. Plain styled wrappers — no client interactivity, so these
// are safe in both server and client components.
import * as React from 'react';

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--brand)] disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  const variants = {
    primary: 'bg-[var(--brand)] text-[var(--brand-fg)] hover:opacity-90',
    secondary: 'bg-[var(--brand-soft)] text-[var(--brand)] hover:opacity-90',
    ghost: 'text-[var(--foreground)] hover:bg-black/5',
    danger: 'bg-[var(--danger)] text-white hover:opacity-90',
  };
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />;
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('block text-sm font-medium text-[var(--foreground)] mb-1', className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]',
        className,
      )}
      {...props}
    />
  );
});

export function Alert({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'error' | 'success' | 'warn';
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-[var(--brand-soft)] text-[var(--brand)]',
    error: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    success: 'bg-green-50 text-[var(--ok)]',
    warn: 'bg-amber-50 text-[var(--warn)]',
  };
  return (
    <div className={cn('rounded-lg px-4 py-3 text-sm', tones[tone], className)} role="alert">
      {children}
    </div>
  );
}

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: 'neutral' | 'danger' | 'warn' | 'ok';
  children: React.ReactNode;
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    warn: 'bg-amber-100 text-[var(--warn)]',
    ok: 'bg-green-100 text-[var(--ok)]',
  };
  return (
    <span
      className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}
    >
      {children}
    </span>
  );
}
