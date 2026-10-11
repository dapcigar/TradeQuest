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

  it('scores lesson answers on the server and does not award completion XP twice', async () => {
    const payload = {
      lessonId: 'spread-basics',
      lessonVersion: '1',
      attemptId: crypto.randomUUID(),
      answers: [{ questionId: 'spread-definition', answerId: 'spread' }],
    };

    const first = await request('/v1/lesson-attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(first.status).toBe(200);
    const firstBody = await first.json() as {
      result: { score: number; passed: boolean; xpAwarded: number; firstCompletion?: boolean; idempotentReplay: boolean };
    };
    expect(firstBody.result.score).toBe(100);
    expect(firstBody.result.passed).toBe(true);
    expect(firstBody.result.idempotentReplay).toBe(false);

    const replay = await request('/v1/lesson-attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(replay.status).toBe(200);
    const replayBody = await replay.json() as {
      result: { score: number; passed: boolean; xpAwarded: number; idempotentReplay: boolean };
    };
    expect(replayBody.result.idempotentReplay).toBe(true);
    expect(replayBody.result.score).toBe(firstBody.result.score);
    expect(replayBody.result.xpAwarded).toBe(firstBody.result.xpAwarded);

    const secondPassingAttempt = await request('/v1/lesson-attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        attemptId: crypto.randomUUID(),
      }),
    });
    expect(secondPassingAttempt.status).toBe(200);
    const secondBody = await secondPassingAttempt.json() as {
      result: { score: number; passed: boolean; xpAwarded: number; firstCompletion: boolean };
    };
    expect(secondBody.result.passed).toBe(true);
    expect(secondBody.result.firstCompletion).toBe(false);
    expect(secondBody.result.xpAwarded).toBe(0);
  });

  it('does not award a progress milestone more than once', async () => {
    const eventKey = 'risk-tool-used-v1';
    const first = await request('/v1/progress-events', userAToken!, {
      method: 'POST',
      body: JSON.stringify({ eventId: crypto.randomUUID(), eventKey }),
    });
    expect(first.status).toBe(200);

    const replay = await request('/v1/progress-events', userAToken!, {
      method: 'POST',
      body: JSON.stringify({ eventId: crypto.randomUUID(), eventKey }),
    });
    expect(replay.status).toBe(200);
    const replayBody = await replay.json() as {
      result: { eventKey: string; xpAwarded: number; alreadyRecorded: boolean };
    };
    expect(replayBody.result.eventKey).toBe(eventKey);
    expect(replayBody.result.xpAwarded).toBe(0);
    expect(replayBody.result.alreadyRecorded).toBe(true);
  });
});
