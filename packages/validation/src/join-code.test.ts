import { describe, expect, it } from 'vitest';
import { parseJoinCode } from './index';

describe('parseJoinCode', () => {
  it('lee el código de la URL del QR', () => {
    expect(parseJoinCode('https://karaoke-smart.onrender.com/join?code=UY6FBB')).toBe('UY6FBB');
    expect(parseJoinCode('https://x.test/join?foo=1&code=uy6fbb#a')).toBe('UY6FBB');
  });
  it('acepta el código suelto', () => {
    expect(parseJoinCode(' ab2cd3 ')).toBe('AB2CD3');
  });
  it('rechaza QR ajenos', () => {
    expect(parseJoinCode('https://example.com')).toBeNull();
    expect(parseJoinCode('WIFI:S:casa;T:WPA;P:1234;;')).toBeNull();
    expect(parseJoinCode('O0I1L0')).toBeNull();
  });
});
