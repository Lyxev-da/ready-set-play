import { describe, expect, it } from 'vitest';
import { bestVerifiedRoll } from '../arcade/game/patterns';

describe('Best-number roll', () => {
  it('rolls the previously verified twelve-digit number at Omega rarity', () => {
    const result = bestVerifiedRoll();
    expect(result.digits.join('')).toBe('177771177771');
    expect(result.rarity).toBe(8.5929984e23);
    expect(result.tier).toBe(11);
  });
});