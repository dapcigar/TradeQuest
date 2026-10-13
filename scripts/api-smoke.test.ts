import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assertApiSecurityHeaders,
  assertHealthPayload,
  assertProtectedEndpointStatus,
  parseApiBaseUrl,
  protectedApiPaths,
} from './api-smoke-lib.mjs';

describe('API smoke-check helpers', () => {
  it('requires a valid HTTP(S) base URL without embedded credentials or URL decorations', () => {
    expect(parseApiBaseUrl('https://example.test/')).toBe('https://example.test');
    expect(() => parseApiBaseUrl('')).toThrow(/TRADEQUEST_SMOKE_API_URL/);
    expect(() => parseApiBaseUrl('file:///tmp/api')).toThrow(/HTTP or HTTPS/);
    expect(() => parseApiBaseUrl('https://user:pass@example.test')).toThrow(/credentials/);
    expect(() => parseApiBaseUrl('https://example.test/?token=secret')).toThrow(/query string/);
  });

  it('accepts only the expected API health identity', () => {
    expect(() => assertHealthPayload(200, { status: 'ok', service: 'tradequest-api' })).not.toThrow();
    expect(() => assertHealthPayload(503, { status: 'ok', service: 'tradequest-api' })).toThrow(/HTTP 503/);
    expect(() => assertHealthPayload(200, { status: 'ok', service: 'other' })).toThrow(/unexpected service payload/);
  });

  it('requires the API defensive security headers', () => {
    const headers = new Headers({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'content-security-policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    });
    expect(() => assertApiSecurityHeaders(headers)).not.toThrow();
    headers.delete('x-frame-options');
    expect(() => assertApiSecurityHeaders(headers)).toThrow(/x-frame-options/);
  });

  it('fails when a protected route is not rejecting anonymous access', () => {
    expect(protectedApiPaths).toContain('/v1/me/export');
    expect(() => assertProtectedEndpointStatus('/v1/me/progress', 401)).not.toThrow();
    expect(() => assertProtectedEndpointStatus('/v1/me/progress', 200)).toThrow(/expected 401/);
    expect(() => assertProtectedEndpointStatus('/v1/me/progress', 503)).toThrow(/expected 401/);
    expect(() => assertProtectedEndpointStatus('/v1/chart-dojo/scenarios', 404)).toThrow(/deployed API is behind the repository/);
  });

  it('covers every protected GET route declared by the API', () => {
    const apiSource = readFileSync(resolve(process.cwd(), 'server/src/index.ts'), 'utf8');
    const declaredRoutes = [...apiSource.matchAll(/app[.]get[(]'([^']+)'/g)]
      .map(match => match[1])
      .filter(path => path.startsWith('/v1/'))
      .map(path => path.replace(/:[a-zA-Z]+/g, '00000000-0000-4000-8000-000000000001'));

    const missing = declaredRoutes.filter(path => !protectedApiPaths.includes(path));
    expect(missing, 'Every protected GET route must be probed by the read-only API smoke check').toEqual([]);
  });
});
