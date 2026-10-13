import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Decode the subject claim from a JWT-shaped access token without logging it.
 * This is a guard against accidentally configuring both integration roles with
 * the same account; the API remains responsible for cryptographic validation.
 */
export function tokenSubject(token, label = 'Integration token') {
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error(`${label} is missing.`);
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some(part => part.length === 0)) {
    throw new Error(`${label} is not a JWT access token.`);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error(`${label} has an invalid JWT payload.`);
  }

  if (!payload || typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new Error(`${label} is missing a subject claim.`);
  }

  return payload.sub;
}

export function assertDistinctTokenSubjects(tokenA, tokenB) {
  const subjectA = tokenSubject(tokenA, 'Account A token');
  const subjectB = tokenSubject(tokenB, 'Account B token');
  if (subjectA === subjectB) {
    throw new Error('Account A and Account B tokens resolve to the same subject. Configure two distinct dedicated test accounts before running any integration writes.');
  }
}

function main() {
  try {
    assertDistinctTokenSubjects(
      process.env.TRADEQUEST_TEST_USER_A_TOKEN,
      process.env.TRADEQUEST_TEST_USER_B_TOKEN,
    );
    console.log('Dedicated test tokens resolve to distinct subjects; token values and subject identifiers were not logged.');
  } catch (error) {
    console.error(`::error::${error instanceof Error ? error.message : 'Unable to validate integration token subjects.'}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
