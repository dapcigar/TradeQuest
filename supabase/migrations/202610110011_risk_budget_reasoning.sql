-- More demanding synthetic risk-budget scenarios: position sizing, aggregate exposure, and costs.
-- Apply after 202610110010_chart_dojo_transfer_depth.sql.
-- Published prompts/choices only; answer keys remain protected by existing column grants.
-- No learner attempt or progress rows are changed.

insert into public.chart_dojo_scenarios
  (scenario_id, version, title, prompt, chart_data, choices, answer_key, published)
values
  (
    'TQ-SYN-016', '1', 'Size the position from the stop',
    'A fictional account has £6,000 equity and a 1% risk budget. A planned stop is 12 points away. Plan A estimates a £45 loss at that stop; Plan B estimates £90. Which approach respects the budget?',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; no real prices or execution","accountEquity":6000,"riskBudgetPercent":1,"plans":[{"id":"A","stopDistance":12,"estimatedLoss":45},{"id":"B","stopDistance":12,"estimatedLoss":90}]}'::jsonb,
    '[{"id":"pick-b","label":"Choose Plan B because the setup looks stronger"},{"id":"check-a","label":"Check Plan A against the £60 budget, including costs, and resize or pass if needed"},{"id":"double-down","label":"Use Plan B because a wider loss estimate is acceptable if confident"}]'::jsonb,
    '{"pick-b":{"outcome":"risk-exceeded","feedback":"The budget is £6,000 × 1% = £60. Plan B estimates £90 before any additional costs, so it exceeds the limit by £30."},"check-a":{"outcome":"risk-aware","feedback":"The budget is £6,000 × 1% = £60. Plan A estimates £45, leaving £15 for costs and estimation error; verify the full potential loss before proceeding, and resize or pass if it no longer fits."},"double-down":{"outcome":"risk-exceeded","feedback":"Confidence does not change the £60 limit. Plan B estimates £90, which is £30 over budget before additional costs."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-017', '1', 'Count total exposure',
    'A fictional account has £8,000 equity and a 1% risk budget (£80). An existing position has £50 estimated loss to its stop. A proposed second position adds £40 estimated loss. What should happen before adding it?',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; no real prices or execution","accountEquity":8000,"riskBudgetPercent":1,"plans":[{"id":"A","stopDistance":5,"estimatedLoss":50},{"id":"B","stopDistance":4,"estimatedLoss":40}],"existingExposure":50,"combinedExposure":90}'::jsonb,
    '[{"id":"add-anyway","label":"Add it because the new position alone is only £40"},{"id":"check-combined","label":"Check combined exposure: £50 + £40 = £90, above the £80 budget"},{"id":"ignore-existing","label":"Treat each position as having its own separate £80 budget"}]'::jsonb,
    '{"add-anyway":{"outcome":"risk-exceeded","feedback":"The new position is not the whole picture. Combined estimated loss is £50 + £40 = £90, which exceeds the £80 budget by £10."},"check-combined":{"outcome":"risk-aware","feedback":"Correct process: total estimated loss would be £50 + £40 = £90, above the £80 limit. Do not add unless total exposure is reduced to fit the budget."},"ignore-existing":{"outcome":"risk-exceeded","feedback":"The budget applies to the stated overall exposure, not separately to every position. Combined estimated loss would be £90 against an £80 limit."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-018', '1', 'Leave room for costs',
    'A fictional account has £5,000 equity and a 1% risk budget (£50). A plan estimates £46 loss at the stop, but expected fees and slippage add about £7. How should the plan be assessed?',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; illustrative costs only; no real prices or execution","accountEquity":5000,"riskBudgetPercent":1,"plans":[{"id":"A","stopDistance":8,"estimatedLoss":46},{"id":"B","stopDistance":8,"estimatedLoss":53}],"estimatedCosts":7}'::jsonb,
    '[{"id":"ignore-costs","label":"Accept it because the stop loss estimate is under £50"},{"id":"include-costs","label":"Include costs: £46 + £7 = £53, then resize or pass"},{"id":"round-down","label":"Round the expected total down to fit the limit"}]'::jsonb,
    '{"ignore-costs":{"outcome":"risk-exceeded","feedback":"The £46 stop estimate plus £7 expected costs is about £53, above the £50 budget. Ignoring costs understates the planned risk."},"include-costs":{"outcome":"risk-aware","feedback":"Correct process: £5,000 × 1% = £50, while £46 + £7 = about £53. Reduce size, revise the plan, or pass so estimated total loss fits the budget."},"round-down":{"outcome":"risk-exceeded","feedback":"Rounding does not remove the £3 excess. Use a realistic estimate of stop loss plus costs and resize or pass if it exceeds £50."}}'::jsonb,
    true
  )
on conflict (scenario_id, version) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  chart_data = excluded.chart_data,
  choices = excluded.choices,
  answer_key = excluded.answer_key,
  published = excluded.published;
