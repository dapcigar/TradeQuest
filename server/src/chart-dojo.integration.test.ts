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

  it('serves all published scenarios, including unseen variants, without exposing answer keys', async () => {
    const response = await request('/v1/chart-dojo/scenarios', userAToken!);
    expect(response.status).toBe(200);
    const body = await response.json() as {
      scenarios: Array<{ scenarioId: string; version: string; title: string; choices: unknown[]; answer_key?: unknown; answerKey?: unknown }>;
    };
    expect(body.scenarios.map(s => s.scenarioId)).toEqual([
      'TQ-SYN-001', 'TQ-SYN-002', 'TQ-SYN-003', 'TQ-SYN-004', 'TQ-SYN-005', 'TQ-SYN-006', 'TQ-SYN-007', 'TQ-SYN-008', 'TQ-SYN-009', 'TQ-SYN-010', 'TQ-SYN-011', 'TQ-SYN-012', 'TQ-SYN-013', 'TQ-SYN-014', 'TQ-SYN-015', 'TQ-SYN-016', 'TQ-SYN-017', 'TQ-SYN-018', 'TQ-SYN-019', 'TQ-SYN-020', 'TQ-SYN-021', 'TQ-SYN-022', 'TQ-SYN-023', 'TQ-SYN-024',
    ]);
    expect(body.scenarios.every(s => s.version === '1' && s.choices.length >= 2)).toBe(true);
    expect(body.scenarios.every(s => s.answer_key === undefined && s.answerKey === undefined)).toBe(true);
  });

  it('scores an Adaptive Practice variant on the server and keeps the attempt private', async () => {
    const attemptId = crypto.randomUUID();
    const submit = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST', body: JSON.stringify({ attemptId, scenarioId: 'TQ-SYN-019', choiceId: 'plan-risk' }),
    });
    expect(submit.status).toBe(200);
    const result = await submit.json() as { result: { outcome: string; feedback: string; attemptId: string } };
    expect(result.result.outcome).toBe('disciplined');
    expect(result.result.feedback).toContain('invalidation condition');
    expect(result.result.attemptId).toBe(attemptId);

    const aHistory = await request('/v1/chart-dojo/attempts', userAToken!);
    const aBody = await aHistory.json() as { attempts: Array<{ attemptId: string; scenarioId: string }> };
    expect(aBody.attempts.some(item => item.attemptId === attemptId && item.scenarioId === 'TQ-SYN-019')).toBe(true);
    const bHistory = await request('/v1/chart-dojo/attempts', userBToken!);
    const bBody = await bHistory.json() as { attempts: Array<{ attemptId: string }> };
    expect(bBody.attempts.some(item => item.attemptId === attemptId)).toBe(false);
  });

  it('persists paper-trade sessions privately and makes candle advancement idempotent', async () => {
    const started = await request('/v1/paper-lab/synthetic-basics/start', userAToken!, {
      method: 'POST', body: JSON.stringify({ direction: 'long', entry: 103, stop: 98, target: 108, equity: 10000, riskPercent: 1 }),
    });
    expect(started.status).toBe(201);
    const startBody = await started.json() as { sessionId: string; version: number; candle: { index: number }; candles: Array<{ index: number }> };
    expect(startBody.version).toBe(0);
    expect(startBody.candle.index).toBe(0);
    expect(startBody.candles.map(candle => candle.index)).toEqual([0]);

    const initialLedger = await request('/v1/paper-lab/sessions/' + startBody.sessionId + '/ledger', userAToken!);
    expect(initialLedger.status).toBe(200);
    expect(initialLedger.headers.get('cache-control')).toContain('no-store');
    const initialLedgerBody = await initialLedger.json() as { events: Array<{ eventType: string; version: number; user_id?: string }> };
    expect(initialLedgerBody.events.map(event => event.eventType)).toEqual(['session_started']);
    expect(initialLedgerBody.events[0].user_id).toBeUndefined();
    expect(initialLedgerBody.events[0]).not.toHaveProperty('sequence');
    const forbiddenLedger = await request('/v1/paper-lab/sessions/' + startBody.sessionId + '/ledger', userBToken!);
    expect(forbiddenLedger.status).toBe(404);

    const advance = () => request('/v1/paper-lab/synthetic-basics/step', userAToken!, {
      method: 'POST', body: JSON.stringify({ sessionId: startBody.sessionId, expectedVersion: 0 }),
    });
    const first = await advance();
    expect(first.status).toBe(200);
    const firstBody = await first.json() as { version: number; currentIndex: number; complete: boolean; [key: string]: unknown };
    expect(firstBody.version).toBe(1);
    expect(firstBody.currentIndex).toBe(1);
    const replay = await advance();
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(firstBody);
    const replayLedger = await request('/v1/paper-lab/sessions/' + startBody.sessionId + '/ledger', userAToken!);
    const replayLedgerBody = await replayLedger.json() as { events: Array<{ eventType: string }> };
    expect(replayLedgerBody.events.map(event => event.eventType)).toEqual(['session_started', 'candle_revealed']);

    const forbidden = await request('/v1/paper-lab/sessions/' + startBody.sessionId, userBToken!);
    expect(forbidden.status).toBe(404);
    const aList = await request('/v1/paper-lab/sessions', userAToken!);
    const aBody = await aList.json() as { sessions: Array<{ sessionId: string }> };
    expect(aBody.sessions.some(item => item.sessionId === startBody.sessionId)).toBe(true);
    const bList = await request('/v1/paper-lab/sessions', userBToken!);
    const bBody = await bList.json() as { sessions: Array<{ sessionId: string }> };
    expect(bBody.sessions.some(item => item.sessionId === startBody.sessionId)).toBe(false);

    let state = firstBody;
    for (let step = 0; step < 12 && !state.complete; step++) {
      const response = await request('/v1/paper-lab/synthetic-basics/step', userAToken!, {
        method: 'POST', body: JSON.stringify({ sessionId: startBody.sessionId, expectedVersion: state.version }),
      });
      expect(response.status).toBe(200);
      state = await response.json() as typeof state;
    }
    expect(state.complete).toBe(true);
    const finalLedger = await request('/v1/paper-lab/sessions/' + startBody.sessionId + '/ledger', userAToken!);
    expect(finalLedger.status).toBe(200);
    const finalLedgerBody = await finalLedger.json() as { events: Array<{ eventType: string; payload: { virtualEquityAfter?: number | null } }> };
    expect(finalLedgerBody.events.some(event => event.eventType === 'session_closed' && typeof event.payload.virtualEquityAfter === 'number')).toBe(true);
    const fillsResponse = await request('/v1/paper-lab/sessions/' + startBody.sessionId + '/fills', userAToken!);
    expect(fillsResponse.status).toBe(200);
    const fillsBody = await fillsResponse.json() as { fills: Array<{ type: string; side: string; price: number | string; units: number | string; realizedPnl: number | string | null; reason: string | null }> };
    expect(fillsBody.fills.map(fill => fill.type)).toEqual(['entry', 'exit']);
    expect(fillsBody.fills[0].side).toBe('buy');
    expect(Number(fillsBody.fills[0].price)).toBe(103);
    expect(fillsBody.fills[1].side).toBe('sell');
    expect(Number(fillsBody.fills[1].realizedPnl)).toBeCloseTo(Number(state['outcome'] && (state['outcome'] as { pnl: number }).pnl));
    expect(fillsBody.fills[1].reason).toBeTruthy();
    const privateFills = await request('/v1/paper-lab/sessions/' + startBody.sessionId + '/fills', userBToken!);
    expect(privateFills.status).toBe(404);
  });

  it('syncs weekly practice plans only to the owning learner', async () => {
    const monday = new Date();
    const day = monday.getUTCDay() || 7;
    monday.setUTCDate(monday.getUTCDate() - day + 1);
    const weekStart = monday.toISOString().slice(0, 10);
    const sessionDate = weekStart;
    const readPlan = async (token: string) => {
      const response = await request('/v1/weekly-plan?weekStart=' + weekStart, token);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('no-store');
      return (await response.json()) as { plan: { week: string; target: number; completedDates: string[] } };
    };

    const invalidWeek = await request('/v1/weekly-plan?weekStart=2026-10-13', userAToken!);
    expect(invalidWeek.status).toBe(400);

    const saveA = await request('/v1/weekly-plan', userAToken!, {
      method: 'PUT', body: JSON.stringify({ weekStart, target: 5 }),
    });
    expect(saveA.status).toBe(200);
    const sessionA = await request('/v1/weekly-plan/session', userAToken!, {
      method: 'PUT', body: JSON.stringify({ weekStart, sessionDate, completed: true }),
    });
    expect(sessionA.status).toBe(200);
    const planA = await readPlan(userAToken!);
    expect(planA.plan.target).toBe(5);
    expect(planA.plan.completedDates).toContain(sessionDate);

    const saveB = await request('/v1/weekly-plan', userBToken!, {
      method: 'PUT', body: JSON.stringify({ weekStart, target: 3 }),
    });
    expect(saveB.status).toBe(200);
    const clearB = await request('/v1/weekly-plan/session', userBToken!, {
      method: 'PUT', body: JSON.stringify({ weekStart, sessionDate, completed: false }),
    });
    expect(clearB.status).toBe(200);
    const planB = await readPlan(userBToken!);
    expect(planB.plan.target).toBe(3);
    expect(planB.plan.completedDates).not.toContain(sessionDate);
    expect((await readPlan(userAToken!)).plan.target).toBe(5);
  });

  it('exports only the signed-in learner\'s server-stored data', async () => {
    const title = 'Account export isolation ' + crypto.randomUUID();
    const created = await request('/v1/decision-journal', userAToken!, {
      method: 'POST',
      body: JSON.stringify({ title, decision: 'waited', thesis: 'Test-only export fixture.' }),
    });
    expect(created.status).toBe(201);
    const createdBody = await created.json() as { entry: { id: string } };
    const exportA = await request('/v1/me/export', userAToken!);
    expect(exportA.status).toBe(200);
    expect(exportA.headers.get('cache-control')).toContain('no-store');
    const bodyA = await exportA.json() as { product: string; formatVersion: number; scope: string; data: { decisionJournalEntries: Array<{ id: string; title: string; user_id?: string }> } };
    expect(bodyA.product).toBe('TradeQuest');
    expect(bodyA.formatVersion).toBe(1);
    expect(bodyA.data.decisionJournalEntries.some(entry => entry.id === createdBody.entry.id && entry.title === title)).toBe(true);
    expect(bodyA.data.decisionJournalEntries.every(entry => entry.user_id === undefined)).toBe(true);
    expect(JSON.stringify(bodyA)).not.toContain('access_token');

    const exportB = await request('/v1/me/export', userBToken!);
    expect(exportB.status).toBe(200);
    const bodyB = await exportB.json() as { data: { decisionJournalEntries: Array<{ id: string; title: string }> } };
    expect(bodyB.data.decisionJournalEntries.some(entry => entry.id === createdBody.entry.id || entry.title === title)).toBe(false);

    const deleted = await request('/v1/decision-journal/' + createdBody.entry.id, userAToken!, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
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

  it('scores a variant scenario on the server and reports it as application, not recall, in mastery', async () => {
    type Skills = { skills: Array<{ skillId: string; recall: { attempts: number }; application: { attempts: number; transferAttempts: number } }> };
    const readPlanning = async (token: string) => {
      const response = await request('/v1/me/mastery', token);
      expect(response.status).toBe(200);
      return ((await response.json()) as Skills).skills.find(skill => skill.skillId === 'planning')!;
    };
    const beforeA = await readPlanning(userAToken!);
    const beforeB = await readPlanning(userBToken!);

    const submit = await request('/v1/chart-dojo/attempts', userAToken!, {
      method: 'POST', body: JSON.stringify({ attemptId: crypto.randomUUID(), scenarioId: 'TQ-SYN-005', choiceId: 'win-it-back' }),
    });
    expect(submit.status).toBe(200);
    const result = await submit.json() as { result: { outcome: string; scenarioVersion: string } };
    expect(result.result.outcome).toBe('undefined-risk');
    expect(result.result.scenarioVersion).toBe('1');

    const afterA = await readPlanning(userAToken!);
    expect(afterA.application.attempts + afterA.recall.attempts).toBe(beforeA.application.attempts + beforeA.recall.attempts + 1);
    // Another learner's recall/application counts are untouched.
    expect(await readPlanning(userBToken!)).toEqual(beforeB);
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
  it('keeps decision journal entries private and supports edit/delete', async () => {
    const payload = {
      title: 'Journal isolation test',
      decision: 'waited',
      scenarioId: 'TQ-SYN-001',
      thesis: 'Wait for observable evidence.',
      invalidation: 'The defined level fails.',
      riskPlan: 'Pass if total exposure exceeds budget.',
      reflection: 'No trade is a valid decision.',
      lessonLearned: 'Write the invalidation first.',
    };
    const created = await request('/v1/decision-journal', userAToken!, { method: 'POST', body: JSON.stringify(payload) });
    expect(created.status).toBe(201);
    const createdBody = await created.json() as { entry: { id: string; title: string; user_id?: string } };
    expect(createdBody.entry.title).toBe(payload.title);
    expect(createdBody.entry.user_id).toBeUndefined();
    const entryId = createdBody.entry.id;

    const aList = await request('/v1/decision-journal', userAToken!);
    const aBody = await aList.json() as { entries: Array<{ id: string; title: string }> };
    expect(aBody.entries.some(entry => entry.id === entryId)).toBe(true);

    const bList = await request('/v1/decision-journal', userBToken!);
    const bBody = await bList.json() as { entries: Array<{ id: string }> };
    expect(bBody.entries.some(entry => entry.id === entryId)).toBe(false);

    const edited = await request('/v1/decision-journal/' + entryId, userAToken!, { method: 'PATCH', body: JSON.stringify({ title: 'Updated journal isolation test' }) });
    expect(edited.status).toBe(200);
    const editedBody = await edited.json() as { entry: { title: string } };
    expect(editedBody.entry.title).toBe('Updated journal isolation test');

    const forbiddenEdit = await request('/v1/decision-journal/' + entryId, userBToken!, { method: 'PATCH', body: JSON.stringify({ title: 'Attempted cross-account edit' }) });
    expect(forbiddenEdit.status).toBe(404);

    const deleted = await request('/v1/decision-journal/' + entryId, userAToken!, { method: 'DELETE' });
    expect(deleted.status).toBe(204);
    const afterDelete = await request('/v1/decision-journal', userAToken!);
    const afterDeleteBody = await afterDelete.json() as { entries: Array<{ id: string }> };
    expect(afterDeleteBody.entries.some(entry => entry.id === entryId)).toBe(false);
  });

  it('deletes only the current learner\'s saved learning data and keeps the account usable', async () => {
    const titleA = 'Delete data fixture A ' + crypto.randomUUID();
    const titleB = 'Delete data fixture B ' + crypto.randomUUID();
    const createA = await request('/v1/decision-journal', userAToken!, {
      method: 'POST', body: JSON.stringify({ title: titleA, decision: 'waited' }),
    });
    const createB = await request('/v1/decision-journal', userBToken!, {
      method: 'POST', body: JSON.stringify({ title: titleB, decision: 'passed' }),
    });
    expect(createA.status).toBe(201);
    expect(createB.status).toBe(201);
    const idB = ((await createB.json()) as { entry: { id: string } }).entry.id;

    const missingConfirmation = await request('/v1/me/delete-learning-data', userAToken!, {
      method: 'POST', body: JSON.stringify({}),
    });
    expect(missingConfirmation.status).toBe(400);

    const deletion = await request('/v1/me/delete-learning-data', userAToken!, {
      method: 'POST', body: JSON.stringify({ confirmation: 'DELETE_MY_LEARNING_DATA' }),
    });
    expect(deletion.status).toBe(200);
    const deletionBody = await deletion.json() as { deleted: Record<string, number> };
    expect(deletionBody.deleted.decisionJournalEntries).toBeGreaterThan(0);
    expect(deletionBody.deleted.weeklyPracticePlans).toBeGreaterThan(0);
    expect(deletionBody.deleted.weeklyPracticeSessions).toBeGreaterThan(0);

    const exportA = await request('/v1/me/export', userAToken!);
    expect(exportA.status).toBe(200);
    const bodyA = await exportA.json() as { data: { progress: { xp: number }; progressEvents: unknown[]; lessonAttempts: unknown[]; chartDojoAttempts: unknown[]; decisionJournalEntries: Array<{ title: string }>; paperTradeSessions: unknown[]; paperTradeLedgerEvents: unknown[]; weeklyPracticePlans: unknown[]; weeklyPracticeSessions: unknown[] } };
    expect(bodyA.data.progress.xp).toBe(0);
    expect(bodyA.data.progressEvents).toHaveLength(0);
    expect(bodyA.data.lessonAttempts).toHaveLength(0);
    expect(bodyA.data.chartDojoAttempts).toHaveLength(0);
    expect(bodyA.data.decisionJournalEntries).toHaveLength(0);
    expect(bodyA.data.paperTradeSessions).toHaveLength(0);
    expect(bodyA.data.paperTradeLedgerEvents).toHaveLength(0);
    expect(bodyA.data.weeklyPracticePlans).toHaveLength(0);
    expect(bodyA.data.weeklyPracticeSessions).toHaveLength(0);

    const exportB = await request('/v1/me/export', userBToken!);
    expect(exportB.status).toBe(200);
    const bodyB = await exportB.json() as { data: { decisionJournalEntries: Array<{ id: string; title: string }> } };
    expect(bodyB.data.decisionJournalEntries.some(entry => entry.id === idB && entry.title === titleB)).toBe(true);
    const cleanupB = await request('/v1/decision-journal/' + idB, userBToken!, { method: 'DELETE' });
    expect(cleanupB.status).toBe(204);
  });

});

