import { describe, expect, it } from 'vitest';

const apiUrl = process.env.TRADEQUEST_TEST_API_URL?.replace(/\/$/, '');
const userAToken = process.env.TRADEQUEST_TEST_USER_A_TOKEN;
const userBToken = process.env.TRADEQUEST_TEST_USER_B_TOKEN;
const enabled = process.env.TRADEQUEST_RUN_INTEGRATION_TESTS === 'true'
  && Boolean(apiUrl && userAToken && userBToken);

const suite = describe.skipIf(!enabled);

suite('Chart Dojo API integration (explicit opt-in; uses two dedicated test accounts)', () => {
  const request = (path: string, token: string, init?: RequestInit) =>
    fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

  it('persists attempts privately and handles replay safely', async () => {
    const attemptId = crypto.randomUUID();
    const payload = {
      attemptId,
      scenarioId: 'TQ-SYN-001',
      choiceId: 'wait',
    };

    const submit = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(submit.status).toBe(200);
    const firstResult = await submit.json() as {
      result: { attemptId: string; choiceId: string; idempotentReplay: boolean };
    };
    expect(firstResult.result.attemptId).toBe(attemptId);
    expect(firstResult.result.choiceId).toBe('wait');
    expect(firstResult.result.idempotentReplay).toBe(false);

    const replay = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(replay.status).toBe(200);
    const replayResult = await replay.json() as {
      result: { attemptId: string; idempotentReplay: boolean; xpAwarded: number };
    };
    expect(replayResult.result.idempotentReplay).toBe(true);
    expect(replayResult.result.xpAwarded).toBe(0);

    const conflictingReplay = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify({ ...payload, choiceId: 'skip' }),
    });
    expect(conflictingReplay.status).toBe(409);

    const userAHistoryResponse = await request('/v1/chart-dojo/attempts', userAToken!);
    expect(userAHistoryResponse.status).toBe(200);
    const userAHistory = await userAHistoryResponse.json() as {
      attempts: Array<{ attemptId: string }>;
    };
    expect(userAHistory.attempts.some((attempt) => attempt.attemptId === attemptId)).toBe(true);

    const userBHistoryResponse = await request('/v1/chart-dojo/attempts', userBToken!);
    expect(userBHistoryResponse.status).toBe(200);
    const userBHistory = await userBHistoryResponse.json() as {
      attempts: Array<{ attemptId: string }>;
    };
    expect(userBHistory.attempts.some((attempt) => attempt.attemptId === attemptId)).toBe(false);
  });

  it('rejects unauthenticated and malformed submissions', async () => {
    const unauthenticated = await fetch(`${apiUrl}/v1/chart-dojo/attempts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        attemptId: crypto.randomUUID(),
        scenarioId: 'TQ-SYN-001',
        choiceId: 'wait',
      }),
    });
    expect(unauthenticated.status).toBe(401);

    const malformed = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify({
        attemptId: 'not-a-uuid',
        scenarioId: 'TQ-SYN-001',
        choiceId: 'wait',
      }),
    });
    expect(malformed.status).toBe(400);
  });
});
