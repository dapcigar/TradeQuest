import { describe, expect, it } from 'vitest';
import { applyApiSecurityHeaders } from './securityHeaders.js';

function responseHeaders() {
  const values = new Map<string, string>();
  return {
    values,
    response: { setHeader: (name: string, value: string) => { values.set(name.toLowerCase(), value); } },
  };
}

describe('API security headers', () => {
  it('sets defensive headers and a deny-by-default CSP in every environment', () => {
    const { values, response } = responseHeaders();
    applyApiSecurityHeaders(response as never, false);
    expect(values.get('x-content-type-options')).toBe('nosniff');
    expect(values.get('x-frame-options')).toBe('DENY');
    expect(values.get('referrer-policy')).toBe('no-referrer');
    expect(values.get('permissions-policy')).toContain('camera=()');
    expect(values.get('content-security-policy')).toContain("default-src 'none'");
    expect(values.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(values.has('strict-transport-security')).toBe(false);
  });

  it('enables HSTS only in production', () => {
    const { values, response } = responseHeaders();
    applyApiSecurityHeaders(response as never, true);
    expect(values.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains');
  });
});
