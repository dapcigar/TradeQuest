import { describe, expect, it } from 'vitest';
import { getBearerToken } from './auth.js';

describe('getBearerToken', () => {
  it('extracts a token from a standard Bearer header', () => {
    expect(getBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('accepts case-insensitive scheme and surrounding whitespace', () => {
    expect(getBearerToken('  bEaReR   abc123  ')).toBe('abc123');
  });

  it('rejects missing and malformed authorization headers', () => {
    for (const header of [
      undefined,
      '',
      'abc123',
      'Basic abc123',
      'Bearer',
      'Bearer token with-spaces',
      'Bearer token\nextra',
    ]) {
      expect(getBearerToken(header)).toBeNull();
    }
  });

  it('rejects empty tokens and tokens longer than 8192 characters', () => {
    expect(getBearerToken('Bearer   ')).toBeNull();
    expect(getBearerToken(`Bearer ${'a'.repeat(8193)}`)).toBeNull();
  });

  it('accepts a token at the maximum allowed length', () => {
    const token = 'a'.repeat(8192);
    expect(getBearerToken(`Bearer ${token}`)).toBe(token);
  });
});
