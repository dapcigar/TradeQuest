-- Additional synthetic variants to give transfer evidence enough breadth to be meaningful.
-- Apply after 20261011175355_chart_dojo_scenario_variants.sql.
-- All answer keys remain server-only; no production learner rows are changed.

insert into public.chart_dojo_scenarios
  (scenario_id, version, title, prompt, chart_data, choices, answer_key, published)
values
  (
    'TQ-SYN-010', '1', 'The plan keeps changing',
    'In a fictional market, you change your entry reason three times as the price moves. You have no stable invalidation level. What is the disciplined next step?',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"30m","contextHeading":"The rules keep moving.","context":"entry reason changes repeatedly; no stable invalidation"}'::jsonb,
    '[{"id":"keep-adjusting","label":"Keep changing the plan until it fits the chart"},{"id":"pause-and-define","label":"Pause and define a testable reason and invalidation before deciding"},{"id":"enter-small","label":"Enter a tiny position without a written plan"}]'::jsonb,
    '{"keep-adjusting":{"outcome":"undefined-risk","feedback":"Changing the rules to fit each new candle makes the idea difficult to test and leaves risk undefined."},"pause-and-define":{"outcome":"disciplined","feedback":"A disciplined choice. Set a reason and invalidation before acting; if you cannot define them, standing aside is valid."},"enter-small":{"outcome":"undefined-risk","feedback":"A smaller position does not replace a reason or an invalidation level. Define the plan first."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-011', '1', 'A stop that breaks the budget',
    'A fictional account has £4,000 equity and a 1% risk budget. Plan A estimates a £30 loss at its stop; Plan B estimates £80. Which process respects the budget?',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; no real prices or execution","accountEquity":4000,"riskBudgetPercent":1,"plans":[{"id":"A","stopDistance":6,"estimatedLoss":30},{"id":"B","stopDistance":16,"estimatedLoss":80}]}'::jsonb,
    '[{"id":"choose-b","label":"Choose Plan B because its stop is farther away"},{"id":"resize-a","label":"Use Plan A only if its full potential loss and costs fit the £40 budget; otherwise resize or pass"},{"id":"ignore-budget","label":"Accept either plan because the difference is small"}]'::jsonb,
    '{"choose-b":{"outcome":"risk-exceeded","feedback":"A farther stop does not make the loss fit the budget. Compare the full potential loss with the £40 limit."},"resize-a":{"outcome":"risk-aware","feedback":"Good process. Plan A fits the £40 budget before other costs; check assumptions and costs, and do not use Plan B unless resized to fit."},"ignore-budget":{"outcome":"risk-exceeded","feedback":"The budget is a limit, not a suggestion. A small-looking difference still exceeds the stated amount."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-012', '1', 'A missed move',
    'A fictional chart has already moved sharply without you. You feel late and want to enter immediately, but you cannot identify a confirmed level or invalidation. What is the evidence-led response?',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"15m","contextHeading":"The move happened. The evidence is incomplete.","context":"sharp completed move; no confirmed level; fear of missing out"}'::jsonb,
    '[{"id":"chase","label":"Chase now before the move goes further"},{"id":"wait-evidence","label":"Wait for observable evidence and a defined invalidation"},{"id":"borrow-opinion","label":"Enter because others say the move will continue"}]'::jsonb,
    '{"chase":{"outcome":"impulsive","feedback":"Feeling late is not evidence. Chasing a completed move without a level or invalidation makes the decision difficult to evaluate."},"wait-evidence":{"outcome":"evidence-led","feedback":"A sound process waits for evidence you can identify and a point that would invalidate the idea. Missing a move is not a failure."},"borrow-opinion":{"outcome":"impulsive","feedback":"Other people''s conviction does not replace observable evidence or your own decision criteria."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-013', '1', 'A plan after a winning streak',
    'After several fictional winning trades, you feel your next idea cannot fail. You have not checked what would invalidate it. What is the disciplined action?',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"1H","contextHeading":"Confidence has risen; uncertainty remains.","context":"recent winning streak; no invalidation defined"}'::jsonb,
    '[{"id":"size-up","label":"Increase size because recent trades worked"},{"id":"define-first","label":"Define the reason, invalidation and risk before deciding"},{"id":"skip-checks","label":"Skip checks while confidence is high"}]'::jsonb,
    '{"size-up":{"outcome":"undefined-risk","feedback":"A winning streak does not remove uncertainty. Increasing size without checking the plan can turn confidence into uncontrolled risk."},"define-first":{"outcome":"disciplined","feedback":"A disciplined choice. Apply the same written criteria after wins as after losses; recent outcomes do not guarantee the next result."},"skip-checks":{"outcome":"undefined-risk","feedback":"Confidence is not a plan. Define what would prove the idea wrong before considering an entry."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-014', '1', 'The budget is nearly spent',
    'A fictional position has used £90 of a £100 risk budget. A new add-on could increase the estimated loss to £125. What keeps the decision within the stated limit?',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; no real prices or execution","accountEquity":10000,"riskBudgetPercent":1,"plans":[{"id":"A","stopDistance":9,"estimatedLoss":90},{"id":"B","stopDistance":12.5,"estimatedLoss":125}]}'::jsonb,
    '[{"id":"add-on","label":"Add the position because only £10 remains before the limit"},{"id":"reduce-or-pass","label":"Do not add; reduce exposure or pass if total potential loss cannot fit £100"},{"id":"hope","label":"Keep the add-on and hope the stop is not reached"}]'::jsonb,
    '{"add-on":{"outcome":"risk-exceeded","feedback":"The add-on takes estimated loss above the £100 budget. Available risk must be assessed against total exposure."},"reduce-or-pass":{"outcome":"risk-aware","feedback":"Good process. Keep total potential loss within the stated budget; reduce exposure or pass rather than exceed it."},"hope":{"outcome":"risk-exceeded","feedback":"Hope does not change the potential loss. The total exposure must fit the budget before the decision is considered."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-015', '1', 'A pattern without confirmation',
    'A fictional chart resembles a familiar pattern, but the key level has not been tested and the latest candle is incomplete. What is the evidence-led next step?',
    '{"kind":"uncertain-breakout","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"4H","context":"familiar-looking pattern; key level untested; candle incomplete"}'::jsonb,
    '[{"id":"pattern-means-go","label":"Enter because the pattern looks familiar"},{"id":"wait-confirm","label":"Wait for the level to be tested and decide using observable evidence"},{"id":"predict","label":"Predict the next candle from the pattern alone"}]'::jsonb,
    '{"pattern-means-go":{"outcome":"impulsive","feedback":"A familiar shape is not confirmation. Treat it as a hypothesis and identify observable evidence before deciding."},"wait-confirm":{"outcome":"evidence-led","feedback":"A sound process waits for observable evidence at a defined level. Even confirmation does not guarantee an outcome."},"predict":{"outcome":"impulsive","feedback":"Predicting the next candle from shape alone overstates what is known. Define evidence and invalidation instead."}}'::jsonb,
    true
  )
on conflict (scenario_id, version) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  chart_data = excluded.chart_data,
  choices = excluded.choices,
  answer_key = excluded.answer_key,
  published = excluded.published;
