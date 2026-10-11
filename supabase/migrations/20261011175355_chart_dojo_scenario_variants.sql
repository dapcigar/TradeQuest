-- Unseen Chart Dojo scenario variants (two more per skill).
-- Apply after 20261011170834_foundations_milestone_requires_quiz.sql.
--
-- Each variant teaches the same risk-first principle as an original scenario in a
-- different fictional situation, so a learner cannot score well just by remembering
-- the answer to TQ-SYN-001..003. Choice ids and the position of the sound choice vary
-- between scenarios on purpose. Outcome labels per skill stay identical to the
-- originals because the mastery summary classifies attempts by outcome:
--   planning:        disciplined | undefined-risk
--   risk-management: risk-aware  | risk-exceeded
--   evidence:        evidence-led | impulsive
-- Answer keys remain server-only (column grants from migration 006 are unchanged).

insert into public.chart_dojo_scenarios
  (scenario_id, version, title, prompt, chart_data, choices, answer_key, published)
values
  (
    'TQ-SYN-004', '1', 'A tip without a reason',
    'A post in a fictional community says an asset is about to run. There is no entry level, no invalidation level, and no written reason for the idea. Decide what to do first.',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"1H","contextHeading":"A claim is visible. A plan is not.","context":"a confident post; no entry level; no invalidation level; no written reason"}'::jsonb,
    '[{"id":"act-on-tip","label":"Enter now before the move happens"},{"id":"pass-for-now","label":"Pass until there is a reason you can write down"},{"id":"write-plan","label":"Write the reason, entry and invalidation level before deciding"}]'::jsonb,
    '{"act-on-tip":{"outcome":"undefined-risk","feedback":"Someone else''s confidence is not your plan. Entering without a reason or an invalidation level leaves both the idea and the risk undefined."},"pass-for-now":{"outcome":"disciplined","feedback":"A disciplined choice. Passing until you can state a reason protects your decision process. Define what would prove the idea wrong before considering an entry."},"write-plan":{"outcome":"disciplined","feedback":"A disciplined choice. Writing the reason, entry and invalidation level first turns an impulse into a testable plan, and shows you whether a plan can be formed at all."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-005', '1', 'A fresh idea after a loss',
    'After a losing trade in a fictional scenario, a new setup appears. You feel pressure to recover quickly and you have not written an invalidation level. Choose the most disciplined next step.',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"15m","contextHeading":"The pressure is visible. The plan is not.","context":"a recent loss; a new setup; urge to recover quickly; no invalidation level"}'::jsonb,
    '[{"id":"pause-plan","label":"Pause, then define the reason and invalidation before any entry"},{"id":"win-it-back","label":"Take it immediately to win the loss back"},{"id":"stand-aside","label":"Stand aside until a plan can be written calmly"}]'::jsonb,
    '{"pause-plan":{"outcome":"disciplined","feedback":"A disciplined choice. A previous loss does not change what a sound plan needs: a reason and a point that proves the idea wrong."},"win-it-back":{"outcome":"undefined-risk","feedback":"Trying to recover a loss is a feeling, not a plan. Entering without an invalidation level can turn one loss into a larger one."},"stand-aside":{"outcome":"disciplined","feedback":"A disciplined choice. Standing aside until you can plan calmly protects your process; there is no obligation to trade every setup."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-006', '1', 'A small account, a tight budget',
    'A fictional account has a stated risk budget of 2%. Plan A fits that budget. Plan B has a stop distance that makes its potential loss larger than the budget. Decide before entering.',
    '{"kind":"risk-budget-comparison","disclosure":"Synthetic teaching data; no real prices or execution","accountEquity":2500,"riskBudgetPercent":2,"plans":[{"id":"A","stopDistance":10,"estimatedLoss":40},{"id":"B","stopDistance":35,"estimatedLoss":140}]}'::jsonb,
    '[{"id":"use-plan-a","label":"Use Plan A, whose potential loss already fits the budget"},{"id":"widen-risk","label":"Keep Plan B as it is; the extra risk is probably fine"},{"id":"resize-b","label":"Reduce Plan B''s size until its potential loss fits the budget"}]'::jsonb,
    '{"use-plan-a":{"outcome":"risk-aware","feedback":"Good process: a plan whose potential loss fits the budget can be considered further. The budget decides, not how attractive a setup looks."},"widen-risk":{"outcome":"risk-exceeded","feedback":"A potential loss above the stated budget means the plan must change. Hoping the extra risk is fine is not risk management."},"resize-b":{"outcome":"risk-aware","feedback":"Good process: resize from the budget and the stop distance until the potential loss fits. If it cannot be made to fit, do not force the trade."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-007', '1', 'Adding to a position under water',
    'A fictional position is down 0.8% of the account against a 1% risk budget. An idea suggests adding the same size to improve the average price. Decide what keeps risk within the budget.',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"1H","contextHeading":"The loss is visible. The remaining budget is small.","context":"open position; 0.8% of account lost; 1% risk budget; proposal to add equal size"}'::jsonb,
    '[{"id":"add-same","label":"Add the same size to improve the average price"},{"id":"review-plan","label":"Reassess against the written plan, and close it if the plan is broken"},{"id":"hold-limit","label":"Keep the original stop and risk budget, and do not add"}]'::jsonb,
    '{"add-same":{"outcome":"risk-exceeded","feedback":"Adding to a losing position increases exposure just when the budget is nearly used. A better average price does not make the potential loss fit the budget."},"review-plan":{"outcome":"risk-aware","feedback":"Good process: the written plan and the risk budget decide, not the wish to recover. If the plan is broken, accepting a small loss keeps risk controlled."},"hold-limit":{"outcome":"risk-aware","feedback":"Good process: keeping to the original stop and budget stops one decision from quietly becoming a much larger risk."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-008', '1', 'A headline and a large candle',
    'A fictional headline and one large candle suggest a breakout, but no level has been confirmed and the candle is still forming. Choose the most disciplined next step.',
    '{"kind":"uncertain-breakout","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"1H","context":"large candle still forming; headline; no confirmed level"}'::jsonb,
    '[{"id":"jump-in","label":"Enter now; the headline is enough"},{"id":"confirm-first","label":"Wait for confirmation at a defined level"},{"id":"no-edge","label":"Take no trade without observable evidence"}]'::jsonb,
    '{"confirm-first":{"outcome":"evidence-led","feedback":"Waiting for confirmation at a defined level reduces impulsive decisions. Confirmation still does not guarantee direction, so define what would invalidate the idea."},"jump-in":{"outcome":"impulsive","feedback":"A headline and an unfinished candle are not confirmation. Entering now trades a story rather than evidence you can point to."},"no-edge":{"outcome":"evidence-led","feedback":"Declining a trade without observable evidence is a sound process choice. The aim is disciplined decisions, not constant participation."}}'::jsonb,
    true
  ),
  (
    'TQ-SYN-009', '1', 'Everyone agrees',
    'In a fictional chat, everyone agrees an asset must rise. No chart evidence has been listed. Decide how to treat the agreement.',
    '{"kind":"illustrative-context","disclosure":"Synthetic teaching data; not live prices","instrument":"SYNTHETIC-ASSET","timeframe":"4H","contextHeading":"Agreement is visible. Evidence is not.","context":"strong agreement in a chat; no observable evidence listed"}'::jsonb,
    '[{"id":"skip-crowd","label":"Pass; agreement is not evidence"},{"id":"list-evidence","label":"List the observable evidence, then decide"},{"id":"follow-crowd","label":"Join because so many people agree"}]'::jsonb,
    '{"skip-crowd":{"outcome":"evidence-led","feedback":"Agreement among people is not observable evidence. Passing until you can point to something concrete keeps the decision yours."},"list-evidence":{"outcome":"evidence-led","feedback":"Listing what you can actually observe separates evidence from opinion, and shows when there is nothing to act on."},"follow-crowd":{"outcome":"impulsive","feedback":"Fear of missing out is not evidence. A crowd can be confidently wrong, and joining without your own reasons leaves the risk undefined."}}'::jsonb,
    true
  )
on conflict (scenario_id, version) do update set
  title = excluded.title,
  prompt = excluded.prompt,
  chart_data = excluded.chart_data,
  choices = excluded.choices,
  answer_key = excluded.answer_key,
  published = excluded.published;

-- Content correction for TQ-SYN-002: Plan A showed a 150 loss against a 1% budget of
-- 100 on a 10000 account, so neither plan fitted the budget the prompt describes.
-- Plan A now fits (stop 10 -> loss 100); Plan B stays above the budget.
update public.chart_dojo_scenarios
set chart_data = jsonb_set(chart_data, '{plans,0}', '{"id":"A","stopDistance":10,"estimatedLoss":100}'::jsonb)
where scenario_id = 'TQ-SYN-002' and version = '1';
