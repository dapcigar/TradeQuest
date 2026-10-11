import { describe, expect, it } from 'vitest';
import { getBearerToken } from './auth.js';

describe('getBearerToken', () => {
  it('extracts a bearer token case-insensitively', () => {
    expect(getBearerToken('Bearer abc.def')).toBe('abc.def');
    expect(getBearerToken('bearer token-value')).toBe('token-value');
  });
  it('rejects missing, malformed and oversized headers', () => {
    expect(getBearerToken(undefined)).toBeNull();
    expect(getBearerToken('')).toBeNull();
    expect(getBearerToken('Basic abc')).toBeNull();
    expect(getBearerToken('Bearer one two')).toBeNull();
    expect(getBearerToken('Bearer ' + 'x'.repeat(8193))).toBeNull();
  });
});
