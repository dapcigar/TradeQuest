export const protectedApiPaths = [
  '/v1/replay/synthetic-basics',
  '/v1/paper-lab/sessions',
  '/v1/paper-lab/sessions/00000000-0000-4000-8000-000000000001',
  '/v1/paper-lab/sessions/00000000-0000-4000-8000-000000000001/fills',
  '/v1/paper-lab/sessions/00000000-0000-4000-8000-000000000001/ledger',
  '/v1/community/profile',
  '/v1/community/profiles',
  '/v1/community/challenges',
  '/v1/community/challenges/entries/mine',
  '/v1/community/challenges/entries',
  '/v1/community/editorial/me',
  '/v1/community/editorial/queue',
  '/v1/community/moderation/me',
  '/v1/community/moderation/queue',
  '/v1/chart-dojo/scenarios',
  '/v1/decision-journal',
  '/v1/weekly-plan',
  '/v1/me/export',
  '/v1/me/progress',
  '/v1/me/mastery',
  '/v1/chart-dojo/attempts',
  '/v1/chart-dojo/attempts/adaptive-summary',
];

export function parseApiBaseUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Set TRADEQUEST_SMOKE_API_URL to the API base URL.');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('TRADEQUEST_SMOKE_API_URL must be a valid absolute URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The API base URL must use HTTP or HTTPS.');
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('The API base URL must not contain credentials, a query string, or a fragment.');
  }
  return url.toString().replace(/\/$/, '');
}

export function assertHealthPayload(status, payload) {
  if (status !== 200) throw new Error(`Health endpoint returned HTTP ${status}; expected 200.`);
  if (payload?.status !== 'ok' || payload?.service !== 'tradequest-api') {
    throw new Error('Health endpoint returned an unexpected service payload.');
  }
}

export function assertApiSecurityHeaders(headers) {
  const expected = [
    ['x-content-type-options', 'nosniff'],
    ['x-frame-options', 'DENY'],
    ['referrer-policy', 'no-referrer'],
    ['permissions-policy', 'camera=(), microphone=(), geolocation=()'],
  ];
  for (const [name, value] of expected) {
    const actual = headers.get(name);
    if (actual?.toLowerCase() !== value.toLowerCase()) {
      throw new Error(`Security header ${name} was ${actual ?? 'missing'}; expected ${value}.`);
    }
  }
  const csp = headers.get('content-security-policy') ?? '';
  if (!csp.includes("default-src 'none'") || !csp.includes("frame-ancestors 'none'")) {
    throw new Error('API Content-Security-Policy is missing its deny-by-default directives.');
  }
}

export function assertProtectedEndpointStatus(path, status) {
  if (status !== 401) {
    throw new Error(`Unauthenticated request to ${path} returned HTTP ${status}; expected 401. A 404 may indicate that the deployed API is behind the repository.`);
  }
}
