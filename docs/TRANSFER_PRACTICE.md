# Unseen scenario variants and transfer tracking

## Why
With three fixed Chart Dojo scenarios a learner could look confident by remembering the three answers. This change adds unseen variants and reports **recall** (a scenario already seen) separately from **application** (a scenario new to the learner), so the dashboard reflects whether the risk-first principle carries over. The Adaptive Practice module now uses six additional server-scored variants (`TQ-SYN-019..024`) for signed-in learners; anonymous demo attempts remain local.

## What changed
- **Content (migrations `20261011175355` and `20261012201500`)**: six original variants `TQ-SYN-004..009` plus six account-backed Adaptive Practice variants `TQ-SYN-019..024`, two per skill (planning, risk-management, evidence). Choice ids and the position of the sound choice differ between scenarios, and outcome labels stay identical within a skill. The same migration corrects `TQ-SYN-002`, whose Plan A (loss 150) exceeded its own 1% budget (100) so neither plan fitted; Plan A is now 100.
- **Mastery (`server/src/mastery.ts`, `skillCatalogue.ts`)**: each attempt is replayed in submission order. First attempt at a scenario is *application*; later attempts at the same scenario are *recall*; application attempts after the skill's first are *transfer*.
- **Confidence**: `building` needs at least 5 attempts across at least 3 scenarios, `early-signal` needs at least 3 attempts across at least 2. Repeating one scenario never builds confidence. The UI shows raw counts ("2 of 2 positive · too few to judge") instead of a percentage until there is an early signal.
- **Recommendation**: points at an unseen variant of the least-practised skill, and says so when every scenario has been seen.
- **UI**: the Progress dashboard shows recall, application, transfer and scenario coverage per skill. Practice tabs show *Practised* / *New to you* for signed-in learners. Risk-budget cards now use the scenario's own budget instead of a hard-coded "1%".

## Tests
- `server/src/masteryTransfer.test.ts`: recall vs application vs transfer, ordering, confidence caps, recommendation.
- `server/src/skillCatalogue.test.ts`: reads the seeded SQL and checks catalogue/DB parity, variation (distinct prompts, sound choice varies in id and position), scoring consistency (every choice scored, outcomes belong to the skill, risk figures match the budget).
- `server/src/accountIsolation.test.ts`: every learner-table read is filtered by the verified id, no service-role client, strict schemas reject user ids/outcomes/XP, RLS and grant checks against the migrations, answer key never granted or selected.
- `src/masteryDisplay.test.ts`: cautious wording for small samples.
- `server/src/chart-dojo.integration.test.ts`: new opt-in test for a variant attempt and cross-account mastery (needs a disposable Supabase project; **not run** here).

## Known limitations
- The isolation tests are static checks of source and SQL; they do not replace the integration suite against a real database with two accounts.
- Mastery reads the latest 500 attempts. An older learner with more could have very old first attempts classified as recall.
- The anonymous demo Chart Dojo catalogue still contains only the original three scenarios and is scored in the browser. Anonymous Adaptive Practice retains its browser-local demo scoring; signed-in Adaptive Practice submits to the server-scored attempt endpoint.
- Variant content is AI-assisted draft material and needs human editorial approval before wider release.
- Migration 009 must be applied to the dev Supabase project before the variants appear; it has not been applied from this session.
