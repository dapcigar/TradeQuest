import express, { type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { getBearerToken } from './auth.js';
import { attemptSchema, chartDojoAttemptSchema, progressEventSchema } from './schemas.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', env.WEB_ORIGIN);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

type AuthedRequest = Request & { learnerId?: string; learnerDb?: SupabaseClient };

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
  if (error || !data.user) return res.status(401).json({ error: 'Session is invalid or expired.' });
  req.learnerId = data.user.id;
  req.learnerDb = learnerDb;
  next();
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'tradequest-api' }));

app.get('/v1/me/progress', requireLearner, async (req: AuthedRequest, res: Response) => {
  const [progressResult, eventsResult] = await Promise.all([
    req.learnerDb!.from('learner_progress')
      .select('xp, lessons_completed, updated_at').eq('user_id', req.learnerId!).maybeSingle(),
    req.learnerDb!.from('progress_events').select('event_key').eq('user_id', req.learnerId!),
  ]);
  if (progressResult.error || eventsResult.error) {
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
    return res.status(400).json({ error: 'Progress event could not be recorded.' });
  }
  return res.status(200).json({ result: data });
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
    return res.status(400).json({ error: 'Chart Dojo attempt could not be saved.' });
  }
  return res.status(200).json({ result: data });
});

app.get('/v1/chart-dojo/attempts', requireLearner, async (req: AuthedRequest, res: Response) => {
  const { data, error } = await req.learnerDb!.from('chart_dojo_attempts')
    .select('attempt_id, scenario_id, choice_id, outcome, feedback, submitted_at')
    .eq('user_id', req.learnerId!)
    .order('submitted_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: 'Chart Dojo history could not be loaded.' });
  return res.json({ attempts: (data ?? []).map((item) => ({
    attemptId: item.attempt_id,
    scenarioId: item.scenario_id,
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
    return res.status(400).json({ error: 'Attempt could not be accepted.' });
  }
  return res.status(200).json({ result: data });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (env.NODE_ENV !== 'production') console.error(err);
  return res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(env.PORT, () => {
  if (env.NODE_ENV !== 'production') console.log(`TradeQuest API listening on :${env.PORT}`);
});
