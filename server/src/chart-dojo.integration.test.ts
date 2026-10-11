import { describe, expect, it } from 'vitest';

const apiUrl = process.env.TRADEQUEST_TEST_API_URL?.replace(/\/$/, '');
const userAToken = process.env.TRADEQUEST_TEST_USER_A_TOKEN;
const userBToken = process.env.TRADEQUEST_TEST_USER_B_TOKEN;
const enabled = process.env.TRADEQUEST_RUN_INTEGRATION_TESTS === 'true'
  && Boolean(apiUrl && userAToken && userBToken);

const suite = describe.skipIf(!enabled);

suite('TradeQuest API integration (explicit opt-in; uses two dedicated test accounts)', () => {
  const request = (path: string, token: string, init?: RequestInit) =>
    fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });

  it('serves multiple published scenarios without exposing answer keys', async () => {
    const response = await request('/v1/chart-dojo/scenarios', userAToken!);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      scenarios: Array<{ scenarioId: string; version: string; title: string; choices: unknown[]; answer_key?: unknown; answerKey?: unknown }>;
    };
    expect(body.scenarios.map(s => s.scenarioId)).toEqual(['TQ-SYN-001', 'TQ-SYN-002', 'TQ-SYN-003']);
    expect(body.scenarios.every(s => s.version === '1' && s.choices.length >= 2)).toBe(true);
    expect(body.scenarios.every(s => s.answer_key === undefined && s.answerKey === undefined)).toBe(true);
  });

  it('persists attempts privately and handles replay safely', async () => {
    const attemptId = crypto.randomUUID();
    const payload = { attemptId, scenarioId: 'TQ-SYN-001', choiceId: 'wait' };

    const submit = await request('/v1/chart-dojo/attempts', userAToken!, { method: 'POST', body: JSON.stringify(payload) });
    expect(submit.status).toBe(200);
    const firstResult = await submit.json() as { result: { attemptId: string; choiceId: string; idempotentReplay: boolean } };
    expect(firstResult.result.attemptId).toBe(attemptId);
    expect(firstResult.result.choiceId).toBe('wait');
    expect(firstResult.result.idempotentReplay).toBe(false);

    const replay = await request('/v1/chart-dojo/attempts', userAToken!, { method: 'POST', body: JSON.stringify(payload) });
    expect(replay.status).toBe(200);
    const replayResult = await replay.json() as { result: { attemptId: string; idempotentReplay: boolean; xpAwarded: number } };
    expect(replayResult.result.idempotentReplay).toBe(true);
    expect(replayResult.result.xpAwarded).toBe(0);

    const conflictingReplay = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST', body: JSON.stringify({ ...payload, choiceId: 'skip' }),
    });
    expect(conflictingReplay.status).toBe(409);

    const userAHistoryResponse = await request('/v1/chart-dojo/attempts', userAToken!);
    expect(userAHistoryResponse.status).toBe(200);
    const userAHistory = await userAHistoryResponse.json() as { attempts: Array<{ attemptId: string }> };
    expect(userAHistory.attempts.some(attempt => attempt.attemptId === attemptId)).toBe(true);

    const userBHistoryResponse = await request('/v1/chart-dojo/attempts', userBToken!);
    expect(userBHistoryResponse.status).toBe(200);
    const userBHistory = await userBHistoryResponse.json() as { attempts: Array<{ attemptId: string }> };
    expect(userBHistory.attempts.some(attempt => attempt.attemptId === attemptId)).toBe(false);
  });

  it('scores lesson answers on the server and does not award completion XP twice', async () => {
    const payload = {
      lessonId: 'spread-basics',
      lessonVersion: '1',
      attemptId: crypto.randomUUID(),
      answers: [{ questionId: 'spread-definition', answerId: 'spread' }],
    };
    const first = await request('/v1/lesson-attempts', userAToken!, { method: 'POST', body: JSON.stringify(payload) });
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { result: { score: number; passed: boolean; xpAwarded: number; idempotentReplay: boolean } };
    expect(firstBody.result.score).toBe(100);
    expect(firstBody.result.passed).toBe(true);
    expect(firstBody.result.idempotentReplay).toBe(false);

    const replay = await request('/v1/lesson-attempts', userAToken!, { method: 'POST', body: JSON.stringify(payload) });
    expect(replay.status).toBe(200);
    const replayBody = await replay.json() as { result: { score: number; passed: boolean; xpAwarded: number; idempotentReplay: boolean } };
    expect(replayBody.result.idempotentReplay).toBe(true);
    expect(replayBody.result.score).toBe(firstBody.result.score);
    expect(replayBody.result.xpAwarded).toBe(firstBody.result.xpAwarded);

    const secondPassingAttempt = await request('/v1/lesson-attempts', userAToken!, {
      method: 'POST', body: JSON.stringify({ ...payload, attemptId: crypto.randomUUID() }),
    });
    expect(secondPassingAttempt.status).toBe(200);
    const secondBody = await secondPassingAttempt.json() as { result: { passed: boolean; xpAwarded: number; firstCompletion: boolean } };
    expect(secondBody.result.passed).toBe(true);
    expect(secondBody.result.firstCompletion).toBe(false);
    expect(secondBody.result.xpAwarded).toBe(0);
  });

  it('does not award a progress milestone more than once', async () => {
    const eventKey = 'risk-tool-used-v1';
    const first = await request('/v1/progress-events', userAToken!, {
      method: 'POST', body: JSON.stringify({ eventId: crypto.randomUUID(), eventKey }),
    });
    expect(first.status).toBe(200);
    const replay = await request('/v1/progress-events', userAToken!, {
      method: 'POST', body: JSON.stringify({ eventId: crypto.randomUUID(), eventKey }),
    });
    expect(replay.status).toBe(200);
    const replayBody = await replay.json() as { result: { eventKey: string; xpAwarded: number; alreadyRecorded: boolean } };
    expect(replayBody.result.eventKey).toBe(eventKey);
    expect(replayBody.result.xpAwarded).toBe(0);
    expect(replayBody.result.alreadyRecorded).toBe(true);
  });

  it('accepts choices from a second scenario and returns server-authored feedback', async () => {
    const response = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify({ attemptId: crypto.randomUUID(), scenarioId: 'TQ-SYN-002', choiceId: 'recalculate' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { result: { scenarioId: string; scenarioVersion: string; choiceId: string; outcome: string; feedback: string } };
    expect(body.result.scenarioId).toBe('TQ-SYN-002');
    expect(body.result.scenarioVersion).toBe('1');
    expect(body.result.choiceId).toBe('recalculate');
    expect(body.result.outcome).toBe('risk-aware');
    expect(body.result.feedback).toContain('risk budget');
  });

  it('aggregates combined mastery signals per account without leaking them to another learner', async () => {
    const readMastery = async (token: string) => {
      const response = await request('/v1/me/mastery', token);
      expect(response.status).toBe(200);
      return response.json() as Promise<{
        skills: Array<{ scenarioId: string; attempts: number }>;
        learningSignals: Array<{ signalId: string; attempts: number; successRate: number | null; measure: string }>;
        sampleSize: number;
      }>;
    };

    const beforeA = await readMastery(userAToken!);
    const beforeB = await readMastery(userBToken!);
    const uniqueAttemptId = crypto.randomUUID();

    const dojo = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify({ attemptId: uniqueAttemptId, scenarioId: 'TQ-SYN-003', choiceId: 'wait' }),
    });
    expect(dojo.status).toBe(200);

    const lesson = await request('/v1/lesson-attempts', userAToken!, {
      method: 'POST',
      body: JSON.stringify({
        lessonId: 'spread-basics',
        lessonVersion: '1',
        attemptId: crypto.randomUUID(),
        answers: [{ questionId: 'spread-definition', answerId: 'spread' }],
      }),
    });
    expect(lesson.status).toBe(200);

    const afterA = await readMastery(userAToken!);
    const afterB = await readMastery(userBToken!);
    const skillA = afterA.skills.find(skill => skill.scenarioId === 'TQ-SYN-003');
    const skillBeforeA = beforeA.skills.find(skill => skill.scenarioId === 'TQ-SYN-003');
    const lessonA = afterA.learningSignals.find(signal => signal.signalId === 'spread-basics');
    const lessonBeforeA = beforeA.learningSignals.find(signal => signal.signalId === 'spread-basics');
    const riskSignalA = afterA.learningSignals.find(signal => signal.signalId === 'risk-tool-used-v1');

    expect(skillA?.attempts).toBe((skillBeforeA?.attempts ?? 0) + 1);
    expect(lessonA?.attempts).toBe((lessonBeforeA?.attempts ?? 0) + 1);
    expect(afterA.sampleSize).toBeGreaterThan(beforeA.sampleSize);
    expect(afterB).toEqual(beforeB);
    expect(riskSignalA?.successRate).toBeNull();
    expect(riskSignalA?.measure).toBe('milestone');
  });

  it('rejects unauthenticated and malformed submissions', async () => {
    const unauthenticated = await fetch(`${apiUrl}/v1/chart-dojo/attempts`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ attemptId: crypto.randomUUID(), scenarioId: 'TQ-SYN-001', choiceId: 'wait' }),
    });
    expect(unauthenticated.status).toBe(401);

    const malformed = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST', body: JSON.stringify({ attemptId: 'not-a-uuid', scenarioId: 'TQ-SYN-001', choiceId: 'wait' }),
    });
    expect(malformed.status).toBe(400);
  });
});
