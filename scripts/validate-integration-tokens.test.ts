import { describe, expect, it } from 'vitest';
import { assertDistinctTokenSubjects, tokenSubject } from './validate-integration-tokens.mjs';

function jwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

describe('integration token subject guard', () => {
  it('extracts a non-empty subject without validating or logging token material', () => {
    expect(tokenSubject(jwt({ sub: 'account-a' }))).toBe('account-a');
  });

  it('rejects missing and malformed tokens', () => {
    expect(() => tokenSubject('')).toThrow(/missing/);
    expect(() => tokenSubject('not-a-jwt')).toThrow(/JWT access token/);
    expect(() => tokenSubject(jwt({ aud: 'authenticated' }))).toThrow(/subject claim/);
    expect(() => tokenSubject('a.%%%not-json%%%.c')).toThrow(/invalid JWT payload/);
  });

  it('allows two distinct dedicated account subjects', () => {
    expect(() => assertDistinctTokenSubjects(jwt({ sub: 'account-a' }), jwt({ sub: 'account-b' }))).not.toThrow();
  });

  it('fails closed when both tokens belong to the same account', () => {
    const sameAccount = jwt({ sub: 'same-account' });
    expect(() => assertDistinctTokenSubjects(sameAccount, sameAccount)).toThrow(/same subject/);
  });
});
