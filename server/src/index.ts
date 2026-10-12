import express, { type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { getBearerToken } from './auth.js';
import { attemptSchema, communityChallengeEntrySchema, communityReportSchema, communityModerationActionSchema, communityProfileSchema, chartDojoAttemptSchema, decisionJournalPatchSchema, decisionJournalSchema, deleteLearningDataSchema, paperTradePlanSchema, paperTradeStepSchema, progressEventSchema, weeklyPracticePlanQuerySchema, weeklyPracticeSessionSchema, weeklyPracticeTargetSchema } from './schemas.js';
import { buildMastery } from './mastery.js';
import { createRateLimiter } from './rateLimit.js';
import { getReplayStep } from './replay.js';
import { applyApiSecurityHeaders } from './securityHeaders.js';

// Recall vs application is derived from attempt order, so read generously.
const MASTERY_ATTEMPT_LIMIT = 500;
const LEARNER_RATE_LIMIT = 60;
const LEARNER_RATE_WINDOW_MS = 60_000;
const learnerLimiter = createRateLimiter(LEARNER_RATE_LIMIT, LEARNER_RATE_WINDOW_MS);

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  applyApiSecurityHeaders(res, env.NODE_ENV === 'production');
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', env.WEB_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Structured, token-free error logging (Vercel captures stdout/stderr). Only the
// error name, code and message are logged; request headers and bodies never are.
function logError(message: string, err: unknown) {
  const e = err as { name?: string; code?: string; status?: number; message?: string } | null;
  console.error(JSON.stringify({ level: 'error', message, name: e?.name, code: e?.code, status: e?.status, detail: e?.message }));
}

type AuthedRequest =Request & { learnerId?: string; learnerDb?: SupabaseClient };

async function requireLearner(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = getBearerToken(req.header('authorization'));
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  // Create a request-scoped client. Supabase/PostgREST calls now carry this
  // learner's JWT, so RLS and auth.uid() evaluate the real user identity.
  // Never use a service-role key for learner requests.
  const learnerDb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await learnerDb.auth.getUser(token);
  if (error) {
    // A 4xx from Auth means the token is bad; anything else (network, 5xx) is an outage,
    // and must not be reported as 401 or the client would sign the learner out.
    const status = typeof error.status === 'number' ? error.status : 0;
    if (status >= 400 && status < 500) return res.status(401).json({ error: 'Session is invalid or expired.' });
    logError('auth.getUser failed', error);
    return res.status(503).json({ error: 'Authentication service is temporarily unavailable.' });
  }
  if (!data.user) return res.status(401).json({ error: 'Session is invalid or expired.' });
  if (!learnerLimiter.allow(data.user.id)) {
    res.setHeader('Retry-After', String(LEARNER_RATE_WINDOW_MS / 1000));
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  req.learnerId = data.user.id;
  req.learnerDb = learnerDb;
  next();
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'tradequest-api' }));
 
// Server-owned synthetic replay: each request reveals exactly one candle.
// The signed continuation token is learner-bound; arbitrary numeric cursors are never accepted.
app.get('/v1/replay/synthetic-basics', requireLearner, (req: AuthedRequest, res: Response) => {
  const secret = process.env.REPLAY_CURSOR_SECRET ?? '';
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    const step = getReplayStep({ token, secret, learnerId: req.learnerId! });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(step);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Replay could not be loaded.';
    if (message.includes('not configured securely')) return res.status(503).json({ error: 'Replay is temporarily unavailable.' });
    return res.status(400).json({ error: 'Replay cursor is invalid. Restart the replay.' });
  }
});


// Persistent server-owned paper trade sessions. Database RPCs own sizing, fills, outcomes and version checks.
app.post('/v1/paper-lab/synthetic-basics/start', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = paperTradePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid paper trade plan.' });
  const d = parsed.data;
  const { data, error } = await req.learnerDb!.rpc('start_paper_trade_session', {
    p_direction: d.direction, p_entry: d.entry, p_stop: d.stop, p_target: d.target,
    p_virtual_equity: d.equity, p_risk_percent: d.riskPercent,
  });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === '22023') return res.status(400).json({ error: 'The paper trade plan is invalid.' });
    logError('Paper trade session could not start.', error);
    return res.status(503).json({ error: 'Paper trade lab is temporarily unavailable. Check that the paper trade migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(201).json(data);
});

app.post('/v1/paper-lab/synthetic-basics/step', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = paperTradeStepSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid paper trade continuation.' });
  const { data, error } = await req.learnerDb!.rpc('advance_paper_trade_session', {
    p_session_id: parsed.data.sessionId, p_expected_version: parsed.data.expectedVersion,
  });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === 'P0002') return res.status(404).json({ error: 'Paper trade session not found.' });
    if (error.code === '40001') return res.status(409).json({ error: 'This session changed in another request. Reload it before continuing.' });
    if (error.code === '22023') return res.status(400).json({ error: 'Paper trade session is closed or invalid.' });
    logError('Paper trade session could not advance.', error);
    return res.status(503).json({ error: 'Paper trade lab is temporarily unavailable. Check that the paper trade migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json(data);
});

app.get('/v1/paper-lab/sessions', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('paper_trade_sessions')
    .select('id, scenario_id, direction, current_index, status, pnl, exit_reason, created_at, closed_at, version')
    .eq('user_id', req.learnerId!).order('created_at', { ascending: false }).limit(20);
  if (error) { logError('Paper trade history could not be loaded.', error); return res.status(503).json({ error: 'Paper trade history is temporarily unavailable.' }); }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ sessions: (data ?? []).map(item => ({ sessionId: item.id, scenarioId: item.scenario_id, direction: item.direction, currentIndex: item.current_index, status: item.status, pnl: item.pnl, exitReason: item.exit_reason, createdAt: item.created_at, closedAt: item.closed_at, version: item.version })) });
});

app.get('/v1/paper-lab/sessions/:id/fills', requireLearner, async (req: AuthedRequest, res: Response) => {
  const sessionId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return res.status(400).json({ error: 'Invalid paper trade session id.' });
  const { data, error } = await req.learnerDb!.from('paper_trade_fills')
    .select('fill_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at')
    .eq('user_id', req.learnerId!).eq('session_id', sessionId).order('fill_sequence', { ascending: true }).limit(2);
  if (error) {
    logError('Paper trade fills could not be loaded.', error);
    return res.status(503).json({ error: 'Paper trade fills are temporarily unavailable. Check that the fill ledger migration is applied.' });
  }
  if (!data || data.length === 0) return res.status(404).json({ error: 'Paper trade session not found.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ fills: data.map(item => ({ fillId: item.fill_id, sequence: item.fill_sequence, type: item.fill_type, side: item.side, price: item.fill_price, units: item.units, realizedPnl: item.realized_pnl, reason: item.fill_reason, filledAt: item.filled_at })) });
});

app.get('/v1/paper-lab/sessions/:id/ledger', requireLearner, async (req: AuthedRequest, res: Response) => {
  const sessionId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return res.status(400).json({ error: 'Invalid paper trade session id.' });
  const { data, error } = await req.learnerDb!.from('paper_trade_ledger_events')
    .select('event_id, event_sequence, event_type, session_version, candle_index, payload, created_at')
    .eq('user_id', req.learnerId!).eq('session_id', sessionId).order('event_sequence', { ascending: true }).limit(1000);
  if (error) {
    logError('Paper trade ledger could not be loaded.', error);
    return res.status(503).json({ error: 'Paper trade ledger is temporarily unavailable. Check that the ledger events migration is applied.' });
  }
  if (!data || data.length === 0) return res.status(404).json({ error: 'Paper trade session not found.' });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ events: data.map(item => ({ eventId: item.event_id, eventType: item.event_type, version: item.session_version, candleIndex: item.candle_index, payload: item.payload, createdAt: item.created_at })) });
});

app.get('/v1/paper-lab/sessions/:id', requireLearner, async (req: AuthedRequest, res: Response) => {
  const sessionId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) return res.status(400).json({ error: 'Invalid paper trade session id.' });
  const { data, error } = await req.learnerDb!.rpc('get_paper_trade_session', { p_session_id: sessionId });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === 'P0002') return res.status(404).json({ error: 'Paper trade session not found.' });
    logError('Paper trade session could not be loaded.', error);
    return res.status(503).json({ error: 'Paper trade session is temporarily unavailable.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json(data);
});

// Only learner-safe scenario fields are selected; answer keys are never sent to the browser.
app.get('/v1/community/profile', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.rpc('get_my_community_profile');
  if (error) {
    logError('Community profile could not be loaded.', error);
    return res.status(503).json({ error: 'Community profile is temporarily unavailable. Check that the community profile migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ profile: data ?? null });
});

app.post('/v1/community/profile', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = communityProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid community profile.', details: parsed.error.flatten() });
  const d = parsed.data;
  const { data, error } = await req.learnerDb!.rpc('save_my_community_profile', {
    p_handle: d.handle, p_display_name: d.displayName, p_bio: d.bio, p_is_public: d.isPublic,
  });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'That community handle is already in use. Choose another one.' });
    if (error.code === '22023') return res.status(400).json({ error: 'Invalid community profile.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Community profile could not be saved.', error);
    return res.status(503).json({ error: 'Community profile could not be saved. Check that the community profile migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ profile: data });
});

app.delete('/v1/community/profile', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { error } = await req.learnerDb!.rpc('delete_my_community_profile');
  if (error) {
    logError('Community profile could not be deleted.', error);
    return res.status(503).json({ error: 'Community profile could not be deleted. Check that the community profile migration is applied.' });
  }
  return res.sendStatus(204);
});

app.get('/v1/community/profiles', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('community_profiles')
    .select('handle, display_name, bio, updated_at')
    .eq('is_public', true).order('updated_at', { ascending: false }).limit(50);
  if (error) {
    logError('Public community profiles could not be loaded.', error);
    return res.status(503).json({ error: 'Community profiles are temporarily unavailable. Check that the community profile migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ profiles: (data ?? []).map(item => ({ handle: item.handle, displayName: item.display_name, bio: item.bio, updatedAt: item.updated_at })) });
});

app.get('/v1/community/challenges', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.rpc('list_community_challenges');
  if (error) {
    logError('Community challenges could not be loaded.', error);
    return res.status(503).json({ error: 'Community challenges are temporarily unavailable. Check that the community challenge migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ challenges: Array.isArray(data) ? data : [] });
});

app.get('/v1/community/challenges/entries/mine', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.rpc('list_my_community_challenge_entries');
  if (error) {
    logError('Your community challenge entries could not be loaded.', error);
    return res.status(503).json({ error: 'Your challenge entries are temporarily unavailable.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ entries: Array.isArray(data) ? data : [] });
});

app.get('/v1/community/challenges/entries', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.rpc('list_public_community_challenge_entries', { p_limit: 50 });
  if (error) {
    logError('Public community challenge entries could not be loaded.', error);
    return res.status(503).json({ error: 'Public challenge entries are temporarily unavailable.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ entries: Array.isArray(data) ? data : [] });
});

app.post('/v1/community/challenges/entries', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = communityChallengeEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid community challenge entry.', details: parsed.error.flatten() });
  const { data, error } = await req.learnerDb!.rpc('submit_community_challenge_entry', {
    p_challenge_id: parsed.data.challengeId,
    p_attempt_id: parsed.data.attemptId,
    p_reflection: parsed.data.reflection,
    p_is_public: parsed.data.isPublic,
  });
  if (error) {
    if (error.code === 'P0002') return res.status(404).json({ error: 'A saved attempt for this challenge was not found.' });
    if (error.code === '22023') return res.status(400).json({ error: error.message.includes('public community profile') ? 'Create and publish your community profile before submitting a public entry.' : 'Invalid community challenge entry.' });
    if (error.code === '23505') return res.status(409).json({ error: 'This saved attempt has already been submitted with different entry content.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Community challenge entry could not be submitted.', error);
    return res.status(503).json({ error: 'Community challenge entry could not be submitted.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(data?.idempotentReplay ? 200 : 201).json({ entry: data });
});

app.delete('/v1/community/challenges/entries/:id', requireLearner, async (req: AuthedRequest, res: Response) => {
  const entryId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  if (typeof entryId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)) {
    return res.status(400).json({ error: 'Invalid community entry id.' });
  }
  const { error } = await req.learnerDb!.rpc('delete_my_community_challenge_entry', { p_entry_id: entryId });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Community challenge entry could not be deleted.', error);
    return res.status(503).json({ error: 'Community challenge entry could not be deleted.' });
  }
  return res.sendStatus(204);
});

app.post('/v1/community/challenges/entries/:id/report', requireLearner, async (req: AuthedRequest, res: Response) => {
  const entryId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  if (typeof entryId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)) {
    return res.status(400).json({ error: 'Invalid community entry id.' });
  }
  const parsed = communityReportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid community report.', details: parsed.error.flatten() });
  const { data, error } = await req.learnerDb!.rpc('report_community_challenge_entry', {
    p_entry_id: entryId, p_category: parsed.data.category, p_details: parsed.data.details,
  });
  if (error) {
    if (error.code === 'P0002') return res.status(404).json({ error: 'Public community entry not found.' });
    if (error.code === '23505') return res.status(409).json({ error: 'You have already reported this entry.' });
    if (error.code === '22023') return res.status(400).json({ error: 'Invalid community report.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Community report could not be submitted.', error);
    return res.status(503).json({ error: 'Community report could not be submitted.' });
  }
  return res.status(201).json({ report: data });
});

app.get('/v1/community/moderation/me', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.rpc('is_community_moderator');
  if (error) {
    logError('Community moderation role could not be checked.', error);
    return res.status(503).json({ error: 'Community moderation role is temporarily unavailable.' });
  }
  return res.json({ isModerator: data === true });
});

app.get('/v1/community/moderation/queue', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.rpc('list_community_moderation_queue');
  if (error) {
    if (error.code === '42501' && /Moderator access required/i.test(error.message)) return res.status(403).json({ error: 'Moderator access required.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Community moderation queue could not be loaded.', error);
    return res.status(503).json({ error: 'Community moderation queue is temporarily unavailable.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ queue: data });
});

app.post('/v1/community/moderation/entries/:id/action', requireLearner, async (req: AuthedRequest, res: Response) => {
  const entryId = typeof req.params.id === 'string' ? req.params.id : req.params.id[0];
  if (typeof entryId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)) {
    return res.status(400).json({ error: 'Invalid community entry id.' });
  }
  const parsed = communityModerationActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid moderation action.', details: parsed.error.flatten() });
  const { data, error } = await req.learnerDb!.rpc('moderate_community_challenge_entry', {
    p_entry_id: entryId, p_action: parsed.data.action, p_reason: parsed.data.reason,
  });
  if (error) {
    if (error.code === 'P0002') return res.status(404).json({ error: 'Community entry not found.' });
    if (error.code === '22023') return res.status(400).json({ error: 'Invalid moderation action.' });
    if (error.code === '42501' && /Moderator access required/i.test(error.message)) return res.status(403).json({ error: 'Moderator access required.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Community moderation action could not be recorded.', error);
    return res.status(503).json({ error: 'Community moderation action could not be recorded.' });
  }
  return res.json({ action: data });
});

app.get('/v1/chart-dojo/scenarios', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('chart_dojo_scenarios')
    .select('scenario_id, version, title, prompt, chart_data, choices')
    .eq('published', true)
    .order('scenario_id', { ascending: true });
  if (error) { logError('Chart Dojo scenarios could not be loaded.', error); return res.status(500).json({ error: 'Chart Dojo scenarios could not be loaded.' }); }
  return res.json({ scenarios: (data ?? []).map((item) => ({
    scenarioId: item.scenario_id,
    version: item.version,
    title: item.title,
    prompt: item.prompt,
    chartData: item.chart_data,
    choices: item.choices,
  })) });
});


const journalFields = 'id, title, scenario_id, decision, thesis, invalidation, risk_plan, reflection, lesson_learned, created_at, updated_at';
function journalEntry(row: Record<string, unknown>) {
  return { ...row };
}
app.get('/v1/decision-journal', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('decision_journal_entries')
    .select(journalFields).eq('user_id', req.learnerId!).order('created_at', { ascending: false }).limit(100);
  if (error) { logError('Decision journal could not be loaded.', error); return res.status(500).json({ error: 'Decision journal could not be loaded.' }); }
  return res.json({ entries: (data ?? []).map(journalEntry) });
});

app.post('/v1/decision-journal', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = decisionJournalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid journal entry.' });
  const d = parsed.data;
  const { data, error } = await req.learnerDb!.from('decision_journal_entries').insert({
    user_id: req.learnerId!, title: d.title, scenario_id: d.scenarioId ?? null, decision: d.decision,
    thesis: d.thesis, invalidation: d.invalidation, risk_plan: d.riskPlan, reflection: d.reflection, lesson_learned: d.lessonLearned,
  }).select(journalFields).single();
  if (error) { logError('Decision journal entry could not be saved.', error); return res.status(400).json({ error: 'Journal entry could not be saved.' }); }
  return res.status(201).json({ entry: journalEntry(data as unknown as Record<string, unknown>) });
});

app.patch('/v1/decision-journal/:id', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = decisionJournalPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid journal update.' });
  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.title !== undefined) updates.title = d.title;
  if (d.scenarioId !== undefined) updates.scenario_id = d.scenarioId;
  if (d.decision !== undefined) updates.decision = d.decision;
  if (d.thesis !== undefined) updates.thesis = d.thesis;
  if (d.invalidation !== undefined) updates.invalidation = d.invalidation;
  if (d.riskPlan !== undefined) updates.risk_plan = d.riskPlan;
  if (d.reflection !== undefined) updates.reflection = d.reflection;
  if (d.lessonLearned !== undefined) updates.lesson_learned = d.lessonLearned;
  updates.updated_at = new Date().toISOString();
  const { data, error } = await req.learnerDb!.from('decision_journal_entries').update(updates)
    .eq('id', req.params.id).eq('user_id', req.learnerId!).select(journalFields).maybeSingle();
  if (error) { logError('Decision journal entry could not be updated.', error); return res.status(400).json({ error: 'Journal entry could not be updated.' }); }
  if (!data) return res.status(404).json({ error: 'Journal entry not found.' });
  return res.json({ entry: journalEntry(data as unknown as Record<string, unknown>) });
});

app.delete('/v1/decision-journal/:id', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('decision_journal_entries').delete()
    .eq('id', req.params.id).eq('user_id', req.learnerId!).select('id').maybeSingle();
  if (error) { logError('Decision journal entry could not be deleted.', error); return res.status(400).json({ error: 'Journal entry could not be deleted.' }); }
  if (!data) return res.status(404).json({ error: 'Journal entry not found.' });
  return res.sendStatus(204);
});

// Destructive self-service action: clears saved learning records, not the auth identity.
app.post('/v1/me/delete-learning-data', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = deleteLearningDataSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Confirm deletion of saved learning data to continue.' });
  const { data, error } = await req.learnerDb!.rpc('delete_own_learning_data');
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('Account learning data deletion failed.', error);
    return res.status(503).json({ error: 'Saved learning data could not be deleted right now.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(data);
});

// Signed-in weekly practice data syncs across devices; anonymous plans remain browser-local.
app.get('/v1/weekly-plan', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = weeklyPracticePlanQuerySchema.safeParse({ weekStart: req.query.weekStart });
  if (!parsed.success) return res.status(400).json({ error: 'A valid Monday weekStart date is required.' });
  const { data, error } = await req.learnerDb!.rpc('get_weekly_practice_plan', { p_week_start: parsed.data.weekStart });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === '22023') return res.status(400).json({ error: 'The weekly practice week is invalid.' });
    logError('Weekly practice plan could not be loaded.', error);
    return res.status(503).json({ error: 'Weekly practice plan is temporarily unavailable. Check that the weekly plan migration is applied.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ plan: data });
});

app.put('/v1/weekly-plan', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = weeklyPracticeTargetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Choose a supported weekly target and valid week.' });
  const { data, error } = await req.learnerDb!.rpc('set_weekly_practice_target', {
    p_week_start: parsed.data.weekStart, p_target: parsed.data.target,
  });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === '22023') return res.status(400).json({ error: 'The weekly practice plan is invalid.' });
    logError('Weekly practice target could not be saved.', error);
    return res.status(503).json({ error: 'Weekly practice target could not be saved.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ plan: data });
});

app.put('/v1/weekly-plan/session', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = weeklyPracticeSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'A valid week, session date, and completion state are required.' });
  const { data, error } = await req.learnerDb!.rpc('set_weekly_practice_session', {
    p_week_start: parsed.data.weekStart, p_session_date: parsed.data.sessionDate, p_completed: parsed.data.completed,
  });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === '22023') return res.status(400).json({ error: 'The session date must belong to the selected week.' });
    logError('Weekly practice session could not be saved.', error);
    return res.status(503).json({ error: 'Weekly practice session could not be saved.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ plan: data });
});

// Export only the signed-in learner's application data. This endpoint deliberately
// excludes auth credentials, tokens, service-role data, and browser-local records.
app.get('/v1/me/export', requireLearner, async (req: AuthedRequest, res: Response) => {
  const db = req.learnerDb!;
  const [progressResult, eventsResult, lessonsResult, dojoResult, journalResult, paperResult, paperLedgerResult, paperFillsResult, weeklyPlansResult, weeklySessionsResult, communityProfileResult, communityEntriesResult, communityReportsResult] = await Promise.all([
    db.from('learner_progress').select('xp, lessons_completed, updated_at').eq('user_id', req.learnerId!).maybeSingle(),
    db.from('progress_events').select('event_id, event_key, xp_awarded, recorded_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('recorded_at', { ascending: true }).limit(10000),
    db.from('lesson_attempts').select('attempt_id, lesson_id, lesson_version, answers, score, passed, xp_awarded, submitted_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('submitted_at', { ascending: true }).limit(10000),
    db.from('chart_dojo_attempts').select('attempt_id, scenario_id, scenario_version, choice_id, outcome, feedback, submitted_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('submitted_at', { ascending: true }).limit(10000),
    db.from('decision_journal_entries').select('id, title, scenario_id, decision, thesis, invalidation, risk_plan, reflection, lesson_learned, created_at, updated_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('created_at', { ascending: true }).limit(10000),
    db.from('paper_trade_sessions').select('id, scenario_id, direction, entry_price, stop_price, target_price, virtual_equity, risk_percent, risk_budget, units, current_index, status, exit_price, exit_reason, pnl, version, created_at, updated_at, closed_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('created_at', { ascending: true }).limit(10000),
    db.from('paper_trade_ledger_events').select('event_id, event_sequence, session_id, session_version, event_type, candle_index, payload, created_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('event_sequence', { ascending: true }).limit(10000),
    db.from('paper_trade_fills').select('fill_id, session_id, fill_sequence, fill_type, side, fill_price, units, realized_pnl, fill_reason, filled_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('filled_at', { ascending: true }).limit(10000),
    db.from('weekly_practice_plans').select('week_start, target, updated_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('week_start', { ascending: true }).limit(10000),
    db.from('weekly_practice_sessions').select('week_start, session_date, created_at', { count: 'exact' }).eq('user_id', req.learnerId!).order('session_date', { ascending: true }).limit(10000),
    db.rpc('get_my_community_profile'),
    db.rpc('list_my_community_challenge_entries'),
    db.rpc('list_my_community_reports'),
  ]);
  const results = [progressResult, eventsResult, lessonsResult, dojoResult, journalResult, paperResult, paperLedgerResult, paperFillsResult, weeklyPlansResult, weeklySessionsResult, communityProfileResult, communityEntriesResult, communityReportsResult];
  const failed = results.find(result => result.error);
  if (failed?.error) {
    logError('Account learning data export failed.', failed.error);
    return res.status(503).json({ error: 'Account learning data could not be exported right now.' });
  }
  const collections = [eventsResult, lessonsResult, dojoResult, journalResult, paperResult, paperLedgerResult, paperFillsResult, weeklyPlansResult, weeklySessionsResult];
  if (collections.some(result => result.count !== null && result.count > (result.data?.length ?? 0))) {
    return res.status(413).json({ error: 'This account has more records than one export can safely include. No partial export was created.' });
  }
  const exportedAt = new Date().toISOString();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tradequest-account-learning-export.json"');
  return res.json({
    product: 'TradeQuest',
    formatVersion: 1,
    exportedAt,
    scope: 'Server-stored learning data and community profile/contribution records for the signed-in account only. Authentication credentials, access tokens, private data belonging to other learners, and browser-local records are not included.',
    data: {
      progress: progressResult.data ?? { xp: 0, lessons_completed: [], updated_at: null },
      progressEvents: eventsResult.data ?? [],
      lessonAttempts: lessonsResult.data ?? [],
      chartDojoAttempts: dojoResult.data ?? [],
      decisionJournalEntries: journalResult.data ?? [],
      paperTradeSessions: paperResult.data ?? [],
      paperTradeLedgerEvents: (paperLedgerResult.data ?? []).map(item => ({ eventId: item.event_id, sessionId: item.session_id, version: item.session_version, eventType: item.event_type, candleIndex: item.candle_index, payload: item.payload, createdAt: item.created_at })),
      paperTradeFills: (paperFillsResult.data ?? []).map(item => ({ fillId: item.fill_id, sessionId: item.session_id, sequence: item.fill_sequence, type: item.fill_type, side: item.side, price: item.fill_price, units: item.units, realizedPnl: item.realized_pnl, reason: item.fill_reason, filledAt: item.filled_at })),
      weeklyPracticePlans: weeklyPlansResult.data ?? [],
      weeklyPracticeSessions: weeklySessionsResult.data ?? [],
      communityProfile: communityProfileResult.data ?? null,
      communityChallengeEntries: Array.isArray(communityEntriesResult.data) ? communityEntriesResult.data : [],
      communityReports: Array.isArray(communityReportsResult.data) ? communityReportsResult.data : [],
    },
  });
});

app.get('/v1/me/progress', requireLearner, async (req: AuthedRequest, res: Response) => {
  const [progressResult, eventsResult] = await Promise.all([
    req.learnerDb!.from('learner_progress')
      .select('xp, lessons_completed, updated_at').eq('user_id', req.learnerId!).maybeSingle(),
    req.learnerDb!.from('progress_events').select('event_key').eq('user_id', req.learnerId!),
  ]);
  if (progressResult.error || eventsResult.error) {
    logError('Could not load progress.', progressResult.error ?? eventsResult.error);
    return res.status(500).json({ error: 'Could not load progress.' });
  }
  return res.json({
    progress: progressResult.data ?? { xp: 0, lessons_completed: [], updated_at: null },
    events: (eventsResult.data ?? []).map((event) => event.event_key),
  });
});

app.post('/v1/progress-events', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = progressEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid progress event.' });
  const { data, error } = await req.learnerDb!.rpc('record_progress_event', {
    p_event_id: parsed.data.eventId,
    p_event_key: parsed.data.eventKey,
  });
  if (error) {
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === '22023') return res.status(400).json({ error: 'Unknown progress event.' });
    if (error.code === '55000') return res.status(409).json({ error: 'Pass the quick check first to earn this milestone.' });
    logError('rpc failed', error);
    return res.status(400).json({ error: 'Progress event could not be recorded.' });
  }
  return res.status(200).json({ result: data });
});

app.get('/v1/me/mastery', requireLearner, async (req: AuthedRequest, res: Response) => {
  const [dojoResult, lessonResult, eventResult] = await Promise.all([
    req.learnerDb!.from('chart_dojo_attempts')
      .select('scenario_id, outcome, submitted_at')
      .eq('user_id', req.learnerId!)
      .order('submitted_at', { ascending: false })
      .limit(MASTERY_ATTEMPT_LIMIT),
    req.learnerDb!.from('lesson_attempts')
      .select('lesson_id, score, passed, submitted_at')
      .eq('user_id', req.learnerId!)
      .order('submitted_at', { ascending: false })
      .limit(100),
    req.learnerDb!.from('progress_events')
      .select('event_key, recorded_at')
      .eq('user_id', req.learnerId!)
      .eq('event_key', 'risk-tool-used-v1'),
  ]);
  if (dojoResult.error || lessonResult.error || eventResult.error) {
    logError('Mastery signals could not be loaded.', dojoResult.error ?? lessonResult.error ?? eventResult.error);
    return res.status(500).json({ error: 'Mastery signals could not be loaded.' });
  }
  return res.json(buildMastery(dojoResult.data ?? [], lessonResult.data ?? [], eventResult.data ?? []));
});

app.post('/v1/chart-dojo/attempts', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = chartDojoAttemptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid Chart Dojo attempt.' });
  const { data, error } = await req.learnerDb!.rpc('submit_chart_dojo_attempt', {
    p_attempt_id: parsed.data.attemptId,
    p_scenario_id: parsed.data.scenarioId,
    p_choice_id: parsed.data.choiceId,
  });
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Attempt ID already used with different content.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    if (error.code === '22023') return res.status(400).json({ error: 'Unknown scenario or choice.' });
    logError('rpc failed', error);
    return res.status(400).json({ error: 'Chart Dojo attempt could not be saved.' });
  }
  return res.status(200).json({ result: data });
});

app.get('/v1/chart-dojo/attempts', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('chart_dojo_attempts')
    .select('attempt_id, scenario_id, scenario_version, choice_id, outcome, feedback, submitted_at')
    .eq('user_id', req.learnerId!)
    .order('submitted_at', { ascending: false })
    .limit(MASTERY_ATTEMPT_LIMIT);
  if (error) { logError('Chart Dojo history could not be loaded.', error); return res.status(500).json({ error: 'Chart Dojo history could not be loaded.' }); }
  return res.json({ attempts: (data ?? []).map((item) => ({
    attemptId: item.attempt_id,
    scenarioId: item.scenario_id,
    scenarioVersion: item.scenario_version,
    choiceId: item.choice_id,
    outcome: item.outcome,
    feedback: item.feedback,
    submittedAt: item.submitted_at,
  })) });
});

app.post('/v1/lesson-attempts', requireLearner, async (req: AuthedRequest, res: Response) => {
  const parsed = attemptSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid attempt payload.', details: parsed.error.flatten() });
  const { data, error } = await req.learnerDb!.rpc('submit_lesson_attempt', {
    p_lesson_id: parsed.data.lessonId,
    p_lesson_version: parsed.data.lessonVersion,
    p_attempt_id: parsed.data.attemptId,
    p_answers: parsed.data.answers,
  });
  if (error) {
    if (error.code === 'P0002') return res.status(404).json({ error: 'Published lesson version not found.' });
    if (error.code === '23505') return res.status(409).json({ error: 'Attempt ID already used with different content.' });
    if (error.code === '42501') return res.status(401).json({ error: 'Authentication required.' });
    logError('rpc failed', error);
    return res.status(400).json({ error: 'Attempt could not be accepted.' });
  }
  return res.status(200).json({ result: data });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // body-parser failures (malformed JSON, oversized body) are client errors, not 500s.
  const status = (err as { status?: number } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return res.status(status).json({ error: status === 413 ? 'Request body too large.' : 'Invalid request.' });
  }
  logError('unhandled error', err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

export { app };

// Vercel imports this module as a serverless handler. Local development and
// the existing Node start command still listen on PORT.
if (process.env.VERCEL !== '1') {
  app.listen(env.PORT, () => {
    if (env.NODE_ENV !== 'production') console.log(`TradeQuest API listening on :${env.PORT}`);
  });
}
