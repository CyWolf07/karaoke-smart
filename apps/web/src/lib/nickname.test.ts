import { describe, expect, it } from 'vitest';
import { loadNickname, saveNickname, validateNickname } from './nickname';

describe('nickname', () => {
  it('recorta espacios y acepta apodos válidos', () => {
    expect(validateNickname('  Ana  ')).toEqual({ ok: true, value: 'Ana' });
  });
  it('rechaza vacío y demasiado largo', () => {
    expect(validateNickname('   ').ok).toBe(false);
    expect(validateNickname('x'.repeat(31)).ok).toBe(false);
  });
  it('persiste en localStorage', () => {
    saveNickname('Luis');
    expect(loadNickname()).toBe('Luis');
  });
});
