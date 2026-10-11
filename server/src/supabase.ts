import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Use the public/anon key only. Requests carry the learner access token.
// Never add a service-role key to this API's environment.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
