import { describe, it, expect } from 'vitest';
import { scoreClass } from './day';

describe('scoreClass', () => {
  it('returns score-unset for null', () => {
    expect(scoreClass(null)).toBe('score-unset');
  });

  it('returns empty string for 0', () => {
    expect(scoreClass(0)).toBe('');
  });

  it('returns correct class for positive scores', () => {
    expect(scoreClass(1)).toBe('score-plus1');
    expect(scoreClass(2)).toBe('score-plus2');
    expect(scoreClass(3)).toBe('score-plus3');
  });

  it('returns correct class for negative scores', () => {
    expect(scoreClass(-1)).toBe('score-minus1');
    expect(scoreClass(-2)).toBe('score-minus2');
    expect(scoreClass(-3)).toBe('score-minus3');
  });
});
