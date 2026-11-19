import { describe, expect, it } from 'vitest';
import { parseYouTubeId } from './index';

describe('parseYouTubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtube.com/watch?list=PL1&v=dQw4w9WgXcQ&t=10', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ ', 'dQw4w9WgXcQ'],
  ])('%s', (input, id) => expect(parseYouTubeId(input)).toBe(id));

  it('devuelve null para texto que no es un enlace', () => {
    expect(parseYouTubeId('bohemian rhapsody karaoke')).toBeNull();
    expect(parseYouTubeId('https://vimeo.com/123')).toBeNull();
  });
});
