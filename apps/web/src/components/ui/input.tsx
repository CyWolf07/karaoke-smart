import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md border border-border bg-surface px-4 text-foreground placeholder:text-muted focus:border-primary focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
