import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

const BASE =
  'min-h-11 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

// The one bright, gradient-filled action per screen — reserve for the single
// primary CTA (submit, save, add), never for secondary/tertiary actions.
export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        BASE,
        'bg-cta text-white shadow-primary hover:brightness-110 focus-visible:outline-primary-light',
        className,
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        BASE,
        'border border-primary-light/35 bg-transparent text-[#E6C9FF] hover:bg-surface focus-visible:outline-primary-light',
        className,
      )}
    />
  );
}

export function TertiaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={clsx(
        BASE,
        'bg-transparent px-2 text-text-secondary underline hover:text-text-primary focus-visible:outline-primary-light',
        className,
      )}
    />
  );
}
