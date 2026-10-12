import type { Response } from 'express';

type HeaderWriter = Pick<Response, 'setHeader'>;

// The API serves JSON only; a deny-by-default CSP is safe here and helps prevent
// accidental active-content responses if an error or route ever returns HTML.
export function applyApiSecurityHeaders(res: HeaderWriter, production: boolean): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  if (production) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
