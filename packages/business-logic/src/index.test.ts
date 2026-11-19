import { describe, expect, it } from 'vitest';
import { activeLineIndex, estimatePosition, parseLrc, slugify } from './index';

describe('parseLrc', () => {
  it('parsea marcas, ignora metadatos y admite varios tiempos por línea', () => {
    const lines = parseLrc('[ar:Artista]\n[00:01.50]Hola\n[00:03.00][00:10.2]Coro\n');
    expect(lines).toEqual([
      { timeMs: 1500, text: 'Hola' },
      { timeMs: 3000, text: 'Coro' },
      { timeMs: 10200, text: 'Coro' },
    ]);
  });

  it('encuentra la línea activa', () => {
    const lines = parseLrc('[00:01.00]a\n[00:02.00]b\n[00:03.00]c');
    expect(activeLineIndex(lines, 500)).toBe(-1);
    expect(activeLineIndex(lines, 2000)).toBe(1);
    expect(activeLineIndex(lines, 99999)).toBe(2);
  });
});

describe('estimatePosition', () => {
  it('avanza solo cuando reproduce', () => {
    expect(estimatePosition({ state: 'playing', positionMs: 1000, serverTime: 0 }, 500)).toBe(1500);
    expect(estimatePosition({ state: 'paused', positionMs: 1000, serverTime: 0 }, 500)).toBe(1000);
  });
});

describe('slugify', () => {
  it('normaliza acentos y símbolos', () => {
    expect(slugify('  Bar La Canción #1 ')).toBe('bar-la-cancion-1');
  });
});
