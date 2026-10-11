# Deploy the TradeQuest API to Vercel

This deploys the Express API as a separate Vercel project from the existing Vite frontend.

## Vercel project settings

1. Import `dapcigar/TradeQuest` as a **new** Vercel project.
2. Set **Root Directory** to `server`.
3. Use the Node.js runtime (Node 20 or newer). The `server/package.json` declares the API's runtime dependencies.
4. Configure these Environment Variables for Production (and Preview only when you intend to test that environment):
   - `SUPABASE_URL`: URL of the Supabase project this API should use.
   - `SUPABASE_ANON_KEY`: Supabase publishable/anon key only; never a service-role or secret key.
   - `WEB_ORIGIN`: exact deployed frontend origin, e.g. `https://tradequest-six.vercel.app` (no path or trailing slash).
   - `NODE_ENV`: `production`.
5. Deploy. The serverless entry point is `api/index.ts`; `/health` should return JSON with `status: "ok"`.

## Connect the frontend

In the existing frontend Vercel project, add the environment variable `VITE_TRADEQUEST_API_URL` set to the API project's deployed origin (for example, `https://tradequest-api-your-team.vercel.app`, with no trailing slash). Redeploy the frontend because Vite variables are embedded at build time.

## Smoke checks

- Open `https://YOUR-API-DOMAIN/health`; expect `{"status":"ok","service":"tradequest-api"}`.
- Check browser devtools on the frontend: signed-in progress, Chart Dojo catalogue/history, mastery and lesson submissions should call the API domain and should not show CORS errors.
- An unauthenticated request to a protected `/v1` endpoint should return HTTP 401.

## Integration test safety

The manual GitHub Actions integration suite writes attempts and progress events. Do not point it at production learner accounts or the production database. First use a disposable Supabase project with migrations 001–006 and the lesson seed, a deployed API configured for that same project, and two dedicated test accounts. Then add the three secrets documented in `.github/workflows/supabase-integration.yml` and manually run **Actions → Supabase integration tests**.

The source repo's normal CI validates type/build/unit tests; it does not prove that Vercel routing, CORS, secrets, or live Supabase RLS are configured correctly.
