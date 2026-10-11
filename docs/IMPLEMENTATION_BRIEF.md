# TradeQuest V2 — Implementation Brief

**Status:** MVP starter in progress  
**Model:** Free, account-based learning platform  
**Audience:** Beginner learners; community challenges planned  
**Market data:** Historical datasets (only when licensing is confirmed) and clearly labelled synthetic data; no live market feeds in MVP.

## Product vision

TradeQuest is a high-quality trading education game for forex, gold, indices, commodities and other markets. Learners build knowledge through short lessons, interactive checks, chart replay, scenario decisions, risk calculations, paper trading and learning-focused challenges.

The product must feel crafted, calm, immersive and useful—not like an AI-generated dashboard, a broker terminal, a signal service, or a noisy gamification layer.

## Non-negotiable principles

1. Education before engagement. Every game mechanic serves a learning outcome.
2. Risk before reward. Reward planning, sound reasoning and no-trade decisions—not profit alone.
3. Honest simulation. Show data source, assumptions, costs, limitations and uncertainty.
4. Synthetic data must never be presented as actual market history.
5. AI-assisted content remains draft until automated validation and human editorial review.
6. Desktop and mobile have equal priority; support keyboard, screen readers, reduced motion and contrast.
7. Free core experience; no paywall or live-feed dependency.
8. No real-money execution, broker integration, copy trading, or personalised financial advice.
9. Protect privacy and moderate community features.
10. No dead controls, meaningless metrics, fake market tickers, filler copy, or placeholder screens in a claimed-complete feature.

## MVP scope

### Core learning
- Responsive account experience and saved progress.
- Beginner curriculum: market foundations; trading mechanics; chart literacy; risk; strategy evaluation; psychology; asset-class differences.
- Lessons with objectives, worked examples, interactive checks, explanations, and review status.
- Objective-level mastery and rules-based revision.
- XP/achievements only for meaningful, idempotent learning actions.

### Practice
- Historical replay only for datasets with confirmed rights; clearly labelled synthetic scenarios.
- Replay cursor must not expose future candles before reveal.
- Deterministic risk calculator and paper simulator with documented assumptions.
- Journal and reflection workflow.
- Candle ambiguity policy: if stop and target occur within the same candle, use a documented conservative rule or finer data; never choose the favourable outcome silently.

### Community
- Curated learning challenges with visible rules and data provenance.
- Score reasoning and risk process, not just P&L.
- Opt-in profiles, reporting, moderation audit trail.
- No open direct messaging in MVP. Never publish private balances, journals, or learning records.

## Visual direction

Create a distinctive “market explorer academy”: a coherent world of zones, missions, practice labs and mastery milestones. Narrative provides orientation but never hides the learning task.

- Deep ink/navy foundation with warm neutral reading surfaces.
- Restrained cobalt primary interactions, teal/green for safe/positive states, amber for caution.
- Clear typography hierarchy, spacious layouts, useful illustrations, labelled charts with axes and annotations.
- Motion only when it clarifies cause and effect; honour reduced-motion settings.
- Avoid excessive gradients, glassmorphism, neon borders, confetti loops, loot-box mechanics, streak-loss pressure, emoji-heavy UI, and generic hero copy.
- Every screen needs loading, empty, error, success, locked and completed states where relevant.

## Screen inventory

1. Landing and public product explanation.
2. Sign up, sign in, account recovery.
3. Onboarding and preferences.
4. Learner home / mission map.
5. Curriculum map and lesson player.
6. Assessment and skill revision.
7. Achievements and skill tree.
8. Historical replay lab and synthetic scenario.
9. Risk calculator.
10. Paper-trading simulator, orders, positions and ledger.
11. Trade journal and process-quality review.
12. Challenge directory, challenge entry and rubric results.
13. Opt-in community profile and learning-focused leaderboard.
14. Content studio with draft/review/publish/versioning/rollback.
15. Moderation queue and audited actions.
16. Profile, privacy, export and deletion settings.

## Content governance and adaptive learning

Every lesson has a stable ID/version, objectives, prerequisites, duration, explanations, examples, misconception checks, glossary, practice, assessment keys/rationales, source metadata, provenance, risk review, editorial reviewer and publication status.

Pipeline: draft → schema validation → automated quality checks → human editorial review → approved → published/retired.

Automated checks flag missing objectives, unsupported claims, contradictory explanations, duplicate questions, missing rationales, and unsafe profit guarantees. Automated checks do not replace human approval. AI must not calculate authoritative P&L, margin, fills or position sizing; deterministic tested code owns those calculations.

Use a rules-based mastery engine in MVP. Track objective outcomes and recency; recommend different practice after an error; use spaced review; require evidence across multiple unseen items; explain recommendations. Keep knowledge mastery separate from simulator outcomes.

## Market-data policy

- Confirm dataset licence and permitted storage/redistribution before import.
- Track source, licence, import date, timezone, symbol mapping, timeframe, schema and dataset versions, and validation status.
- Validate ordering, duplicate timestamps, missing intervals, OHLC relationships, outliers, sessions and timezone handling.
- Never silently fill missing data.
- Label every session **Historical** or **Synthetic** and disclose limitations.
- Return only candles through the current cursor. Do not send future candles in client state, HTML, preloaded API responses, caches or bundles.
- Test direct future-index requests and replay reproducibility.
- Version instrument specs: precision, tick size/value assumptions, contract size, lot increments, sessions and supported costs. Do not assume forex pip conventions apply to gold, indices or crypto.

## Architecture

Recommended MVP stack:
- Next.js/React/TypeScript for production application; current starter uses Vite + React + TypeScript for a lightweight first slice.
- Tailwind/accessibility primitives or a similarly coherent component system.
- PostgreSQL/Supabase Auth with Row Level Security for account-based progress.
- Zod for inputs and content schemas.
- Vitest for domain tests; Playwright for critical end-to-end flows.
- Vercel/Supabase are candidate deployment choices, subject to environment and operational review.

Start as a modular monolith. Do not introduce microservices, vector databases, queues or agent orchestration without a demonstrated need. Never expose service-role keys in browser code. Keep simulation, scoring, mastery and XP authoritative on the server. Commit migrations and test RLS isolation.

Logical modules: identity, curriculum, assessment, mastery, content governance, market data, replay, risk, simulation, journal, community, moderation, gamification, admin.

## Repository target structure

```text
tradequest/
  AGENTS.md
  README.md
  docs/
    IMPLEMENTATION_BRIEF.md
    DESIGN_SYSTEM.md
    SECURITY_ARCHITECTURE.md
    MARKET_DATA_SPEC.md
    SIMULATION_ENGINE_SPEC.md
    TESTING_STRATEGY.md
    DECISIONS.md
  src/
    App.tsx
    styles.css
    risk.ts
    risk.test.ts
  supabase/
    migrations/
    tests/
  content/
    curriculum/
    scenarios/
```

## Milestones and acceptance gates

### M0 — Audit and foundations
Inspect repository, protect existing work, document architecture and product invariants, configure lint/typecheck/tests/CI and migrations.
**Accept:** clean install/build; CI runs checks; no secrets; MVP exclusions recorded.

### M1 — Design system and complete learning slice
Responsive shell, accessible navigation, account-ready learning structure, one high-quality lesson with examples, quiz, feedback and saved progress.
**Accept:** desktop/mobile flow works; progress survives sign-out/sign-in after account persistence is implemented; keyboard-only core lesson works; no dead controls.

### M2 — Curriculum, assessment and mastery
Versioned content schema, objective-level assessment, targeted revision, spaced review and idempotent XP.
**Accept:** invalid content cannot publish; unreviewed content cannot publish; weak skill recommends a different practice; duplicate requests cannot duplicate XP.

### M3 — Replay and scenarios
Licensed sample dataset after rights confirmation, dataset validation, replay cursor, annotations and synthetic scenario format.
**Accept:** future candles cannot be fetched before reveal; labels are clear; replay reproducible; invalid OHLC and gaps follow documented rules.

### M4 — Risk and paper simulation
Instrument specs, decimal arithmetic, risk calculator, bounded order set, account ledger, cost assumptions, journal and reconciliation.
**Accept:** independent fixtures for supported instruments; ledger reconciles; idempotent retries; invalid orders rejected; no real-money execution path.

### M5 — Community challenges
Rules, entries, rubric results, opt-in profiles, reporting and moderation.
**Accept:** private data never public; moderation actions audited; no profit-only leaderboard; access and abuse controls tested.

### M6 — Security, accessibility and content review
RLS, authorisation, session handling, rate limits, export/deletion, responsive/screen-reader/reduced-motion and content coverage.
**Accept:** no unresolved critical/high security issues; cross-account tests pass; no critical accessibility blockers; all published lessons editorially approved.

### M7 — Production launch
Backups, monitoring, logs, migrations, smoke tests, rollback and support runbook.
**Accept:** smoke tests pass; recovery is documented and rehearsed; labels correct; no live feed; no critical/high unresolved security issues.

## Testing strategy

Unit tests: risk math, rounding, instrument increments, P&L/costs/margin, mastery transitions, spaced review, XP idempotency, dataset validation, replay cursor, content schema and publication state.

Integration: auth/RLS, cross-user denial, transactional ledger updates, content review/publish, challenge/report/moderation lifecycle.

End-to-end: signup → lesson → assessment → resume; wrong answer → targeted revision; replay future-candle access denied; risk calculation → simulated order → close/reconcile; idempotent retry; challenge entry/result; report/moderation; keyboard-only core journey.

Security: RLS for all user-owned tables, server-side admin checks, cursor bypass, mass assignment, rate limits, injection, secret leakage, AI publication approval.

## Claude Code workflow

1. Inspect git status, repository files, package scripts, dependencies and existing prototype before editing.
2. Read AGENTS.md and task-relevant specs; if code and spec conflict, stop and reconcile.
3. Plan bounded change, affected modules, data migrations, risks, acceptance criteria and tests.
4. Implement with minimal unrelated refactoring.
5. Run targeted tests, relevant full suite, lint, typecheck and build. Never claim checks passed unless run.
6. Run a separate review for security, education, simulation correctness or UX as relevant.
7. Fix and retest bounded failures; report unresolved issues honestly.
8. Commit coherent tested work, update docs and handover.
9. After each completed task, persist the handover then use /clear or supported equivalent; reload AGENTS.md and only required task context. /clear resets context, not usage limits.
10. Avoid parallel agents editing the same files.

Definition of done: acceptance evidence; tests for new behaviour/failure cases; lint/typecheck/tests pass; accessibility and security reviewed; docs updated; no fake data presented as real; no placeholder controls; known limitations documented.

Required report:
- Task and scope
- Files changed
- Spec references
- Acceptance criteria and evidence
- Tests run and results
- Security/accessibility review
- Known limitations
- Database/config changes
- Commit and next task

## Decisions to resolve before affected milestone

- Historical data provider/licence/redistribution/instruments/timeframes.
- Supported instrument specs and costs.
- Ambiguous candle execution policy.
- Challenge scoring and moderation rules.
- Editorial review responsibilities.
- Retention/deletion/analytics.
- Hosting region, backups and incident ownership.

Record decisions in DECISIONS.md or an ADR. Do not silently invent defaults.

## MVP release gate

A learner can complete a reviewed beginner journey and resume across devices; adaptive revision targets weak skills; replay passes future-data leakage tests; synthetic scenarios are clearly labelled; risk/simulation calculations pass independent fixtures and ledger reconciliation; community privacy/reporting/moderation work; core journeys meet accessibility and responsive requirements; cross-account tests pass; backup/rollback/support are documented; no live feed or real-money execution exists; no critical/high unresolved security issues remain.

**Product standard:** Fun comes from exploring, deciding, seeing consequences and improving. Trust comes from reviewed content, honest data, testable calculations and visible limitations.
