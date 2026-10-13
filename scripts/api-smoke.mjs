import {
  assertApiSecurityHeaders,
  assertHealthPayload,
  assertProtectedEndpointStatus,
  parseApiBaseUrl,
  protectedApiChecks,
} from './api-smoke-lib.mjs';

const baseUrl = parseApiBaseUrl(process.env.TRADEQUEST_SMOKE_API_URL);
const timeoutMs = 10_000;

async function request(method, path) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json' },
  });
  return response;
}

try {
  const health = await request('GET', '/health');
  assertApiSecurityHeaders(health.headers);
  let healthPayload;
  try {
    healthPayload = await health.json();
  } catch {
    throw new Error('Health endpoint did not return valid JSON.');
  }
  assertHealthPayload(health.status, healthPayload);
  console.log('PASS /health: API is responding with expected service identity and defensive headers.');

  for (const { method, path } of protectedApiChecks) {
    const response = await request(method, path);
    assertApiSecurityHeaders(response.headers);
    assertProtectedEndpointStatus(method, path, response.status);
    console.log(`PASS ${method} ${path}: unauthenticated request rejected.`);
  }

  console.log('TradeQuest API smoke check passed. This read-only unauthenticated check does not prove account isolation, database migration status, or full learner journeys.');
} catch (error) {
  console.error('TradeQuest API smoke check FAILED');
  console.error(error instanceof Error ? error.message : 'Unexpected smoke-check failure.');
  process.exitCode = 1;
}
