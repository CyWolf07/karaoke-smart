import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('fusiona clases de Tailwind resolviendo conflictos', () => {
    const hidden = false;
    expect(cn('px-2 text-sm', hidden && 'hidden', 'px-4')).toBe('text-sm px-4');
  });
});
