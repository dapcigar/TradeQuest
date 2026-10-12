-- Six server-scored variants for Adaptive Practice. Answer keys remain server-only.
insert into public.chart_dojo_scenarios (
  scenario_id, version, title, prompt, chart_data, choices, answer_key, published
) values
  (
    'TQ-SYN-019', '1', 'The plan has a missing piece',
    'A fictional asset has moved steadily higher. A learner has a possible entry idea, but cannot explain where the idea would be invalidated or what loss would be acceptable.',
    '{"kind":"plan-gap","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","context":"entry idea without invalidation or risk budget"}'::jsonb,
    '[{"id":"plan-risk","label":"Define invalidation and acceptable loss before deciding"},{"id":"enter-now","label":"Enter now because the move looks orderly"},{"id":"copy-entry","label":"Copy another learner’s entry and work out risk later"}]'::jsonb,
    '{"plan-risk":{"outcome":"disciplined","feedback":"A setup is incomplete until the thesis, invalidation condition, and acceptable loss are clear. A smooth-looking move does not remove uncertainty."},"enter-now":{"outcome":"undefined-risk","feedback":"A smooth-looking move is not a complete plan. Without invalidation and acceptable loss, the decision cannot be reviewed or bounded responsibly."},"copy-entry":{"outcome":"undefined-risk","feedback":"Another learner’s entry does not establish that the idea fits your own evidence or risk budget. Define your own invalidation and acceptable loss first."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-020', '1', 'A confident thesis, no exit condition',
    'In a new fictional scenario, the written thesis is detailed and the learner feels confident. They have not identified what evidence would show the thesis is wrong.',
    '{"kind":"invalidation-gap","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","context":"confident thesis without an observable invalidation condition"}'::jsonb,
    '[{"id":"confidence-only","label":"Treat confidence as enough evidence to proceed"},{"id":"state-invalidation","label":"Write an observable invalidation condition before proceeding"},{"id":"single-candle","label":"Use the most recent candle as the only exit rule"}]'::jsonb,
    '{"confidence-only":{"outcome":"undefined-risk","feedback":"Confidence is not a risk control. A thesis needs an observable condition that would make you reconsider it."},"state-invalidation":{"outcome":"disciplined","feedback":"An invalidation condition should be explicit and linked to the thesis, not improvised from one candle or a feeling of confidence."},"single-candle":{"outcome":"undefined-risk","feedback":"A single candle without a clear relationship to the thesis is not a robust invalidation rule. State what evidence would make the idea wrong."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-021', '1', 'The unfinished signal',
    'A synthetic chart reaches a level watched by the learner, but the illustrative candle has not closed. There is no confirmed break in this teaching scenario.',
    '{"kind":"unfinished-signal","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","context":"watched level; candle not closed"}'::jsonb,
    '[{"id":"chase","label":"Act immediately so the move is not missed"},{"id":"wait-for-evidence","label":"Wait for the planned evidence; reassess if it never appears"},{"id":"assume-confirmation","label":"Assume the next candle will confirm the idea"}]'::jsonb,
    '{"chase":{"outcome":"impulsive","feedback":"A potential signal is not confirmed evidence. Fear of missing a move is not a reason to bypass the stated checklist."},"wait-for-evidence":{"outcome":"evidence-led","feedback":"A potential signal is not confirmed evidence. Waiting or passing is valid; even a completed candle cannot guarantee what happens next."},"assume-confirmation":{"outcome":"impulsive","feedback":"Predicting the next candle replaces evidence with an assumption. Define what would count as confirmation and what would invalidate the idea."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-022', '1', 'News creates urgency',
    'A fictional headline causes a sharp move in an illustrative chart. The learner’s checklist requires a calm review, but they feel pressure to act before others do.',
    '{"kind":"urgency-pressure","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","context":"headline urgency and fear of missing out"}'::jsonb,
    '[{"id":"urgency","label":"Enter quickly because urgency suggests opportunity"},{"id":"checklist-first","label":"Return to the checklist and pass if evidence is insufficient"},{"id":"assume-continuation","label":"Assume the first move will continue"}]'::jsonb,
    '{"urgency":{"outcome":"impulsive","feedback":"Urgency and fear of missing out are not evidence. Apply the same checklist under pressure and accept a no-trade decision."},"checklist-first":{"outcome":"evidence-led","feedback":"Apply the same checklist under pressure, and accept no-trade when requirements are not met. A headline does not guarantee continuation."},"assume-continuation":{"outcome":"impulsive","feedback":"A sharp first move does not establish what happens next. A continuation assumption is not a substitute for observable evidence."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-023', '1', 'The loss exceeds the limit',
    'A hypothetical plan has a planned loss of £180, while the learner’s stated maximum for this exercise is £75. The thesis may be plausible, but the figures do not fit.',
    '{"kind":"risk-budget-mismatch","disclosure":"Synthetic teaching data; no real prices or execution","riskBudget":75,"plannedLoss":180,"currency":"GBP"}'::jsonb,
    '[{"id":"recalculate-size","label":"Recalculate size or reject the plan if it cannot fit the limit"},{"id":"accept-larger-risk","label":"Accept the larger loss because the thesis seems strong"},{"id":"ignore-limit","label":"Ignore the limit and focus on the possible upside"}]'::jsonb,
    '{"recalculate-size":{"outcome":"risk-aware","feedback":"The risk budget is a constraint, not a target to exceed when confidence rises. Resize using valid assumptions or do not proceed."},"accept-larger-risk":{"outcome":"risk-exceeded","feedback":"A plausible thesis does not make an over-budget loss acceptable. Confidence should not override the stated risk constraint."},"ignore-limit":{"outcome":"risk-exceeded","feedback":"Ignoring the limit does not reduce the possible loss. Resize the plan or pass when the figures cannot fit the budget."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-024', '1', 'Two plans, one budget',
    'A fictional exercise sets a maximum loss of 1% of virtual equity. Plan A would risk 0.7%; Plan B would risk 1.6%, before any omitted costs.',
    '{"kind":"compare-risk-budget","disclosure":"Synthetic teaching data; no real prices or execution","riskBudgetPercent":1,"plans":[{"id":"A","riskPercent":0.7},{"id":"B","riskPercent":1.6}]}'::jsonb,
    '[{"id":"larger-risk","label":"Choose B because a wider risk can capture more movement"},{"id":"average-loss","label":"Average the two losses to make both acceptable"},{"id":"within-budget","label":"Treat A as within the stated limit and review omitted costs"}]'::jsonb,
    '{"larger-risk":{"outcome":"risk-exceeded","feedback":"A wider risk does not become acceptable because it might capture more movement. Compare the planned loss to the stated limit."},"average-loss":{"outcome":"risk-exceeded","feedback":"Averaging two plans does not make either plan fit the stated risk budget. Evaluate each plan and include omitted costs."},"within-budget":{"outcome":"risk-aware","feedback":"Plan A is within the stated 1% limit before omitted costs. Review fees, gaps and other assumptions; this exercise is educational, not a trade recommendation."}}'::jsonb,
    true
  )
on conflict (scenario_id, version) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  chart_data = excluded.chart_data,
  choices = excluded.choices,
  answer_key = excluded.answer_key,
  published = excluded.published;
