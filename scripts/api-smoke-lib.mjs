const exampleId = '00000000-0000-4000-8000-000000000001';

export const protectedApiChecks = [
  ['GET', '/v1/replay/synthetic-basics'],
  ['POST', '/v1/paper-lab/synthetic-basics/start'],
  ['POST', '/v1/paper-lab/synthetic-basics/step'],
  ['GET', '/v1/paper-lab/sessions'],
  ['GET', '/v1/paper-lab/sessions/' + exampleId],
  ['GET', '/v1/paper-lab/sessions/' + exampleId + '/fills'],
  ['GET', '/v1/paper-lab/sessions/' + exampleId + '/ledger'],
  ['GET', '/v1/community/profile'],
  ['POST', '/v1/community/profile'],
  ['DELETE', '/v1/community/profile'],
  ['GET', '/v1/community/profiles'],
  ['GET', '/v1/community/challenges'],
  ['GET', '/v1/community/challenges/entries/mine'],
  ['GET', '/v1/community/challenges/entries'],
  ['POST', '/v1/community/challenges/entries'],
  ['DELETE', '/v1/community/challenges/entries/' + exampleId],
  ['POST', '/v1/community/challenges/entries/' + exampleId + '/report'],
  ['GET', '/v1/community/editorial/me'],
  ['GET', '/v1/community/editorial/queue'],
  ['POST', '/v1/community/editorial/' + exampleId + '/review'],
  ['GET', '/v1/community/moderation/me'],
  ['GET', '/v1/community/moderation/queue'],
  ['GET', '/v1/community/moderation/history'],
  ['POST', '/v1/community/moderation/entries/' + exampleId + '/action'],
  ['GET', '/v1/chart-dojo/scenarios'],
  ['GET', '/v1/decision-journal'],
  ['POST', '/v1/decision-journal'],
  ['PATCH', '/v1/decision-journal/' + exampleId],
  ['DELETE', '/v1/decision-journal/' + exampleId],
  ['POST', '/v1/me/delete-learning-data'],
  ['GET', '/v1/weekly-plan'],
  ['GET', '/v1/me/export'],
  ['GET', '/v1/me/progress'],
  ['POST', '/v1/progress-events'],
  ['GET', '/v1/me/mastery'],
  ['POST', '/v1/chart-dojo/attempts'],
  ['GET', '/v1/chart-dojo/attempts'],
  ['GET', '/v1/chart-dojo/attempts/adaptive-summary'],
  ['POST', '/v1/lesson-attempts'],
].map(([method, path]) => ({ method, path }));

export const protectedApiPaths = protectedApiChecks.filter(check => check.method === 'GET').map(check => check.path);

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

export function assertProtectedEndpointStatus(method, path, status) {
  if (status !== 401) {
    throw new Error(`Unauthenticated ${method} request to ${path} returned HTTP ${status}; expected 401. A 404 may indicate that the deployed API is behind the repository.`);
  }
}
