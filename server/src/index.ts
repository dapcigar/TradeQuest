import express, { type NextFunction, type Request, type Response } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { env } from './env.js';
import { getBearerToken } from './auth.js';

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
  const { data, error } = await req.learnerDb!.from('learner_progress')
    .select('xp, lessons_completed, updated_at').eq('user_id', req.learnerId!).maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not load progress.' });
  return res.json({ progress: data ?? { xp: 0, lessons_completed: [], updated_at: null } });
});

const attemptSchema = z.object({
  lessonId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
  lessonVersion: z.string().min(1).max(40),
  attemptId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().min(1).max(80),
    answerId: z.string().min(1).max(80),
  }).strict()).min(1).max(50),
}).strict();

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
