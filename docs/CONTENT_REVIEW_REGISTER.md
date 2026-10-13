# TradeQuest curriculum review register

This register tracks source-controlled learning content. TradeQuest does not currently have a content-management or publication console; content changes ship with code and must pass review before release.

**Current sign-off status:** human editorial approval is pending. Automated tests and source checks are evidence of structural quality only; they do not establish factual accuracy, suitability, or editorial approval.

| Learning area | Content source | Automated test | Human editorial sign-off |
|---|---|---|---|
| Core learning catalogue and lesson sequence | `src/learning.ts` | `src/learning.test.ts` | Pending |
| Candle literacy | `src/candleLiteracy.ts` | `src/candleLiteracy.test.ts` | Pending |
| Support and resistance | `src/supportResistance.ts` | `src/supportResistance.test.ts` | Pending |
| Trend structure | `src/trendStructure.ts` | `src/trendStructure.test.ts` | Pending |
| Breakouts and false breakouts | `src/breakoutLiteracy.ts` | `src/breakoutLiteracy.test.ts` | Pending |
| Risk/reward | `src/riskRewardLiteracy.ts` | `src/riskRewardLiteracy.test.ts` | Pending |
| Leverage and margin | `src/leverageMarginLiteracy.ts` | `src/leverageMarginLiteracy.test.ts` | Pending |
| Position sizing | `src/positionSizingLiteracy.ts` | `src/positionSizingLiteracy.test.ts` | Pending |
| Drawdown | `src/drawdownLiteracy.ts` | `src/drawdownLiteracy.test.ts` | Pending |
| Trading psychology | `src/psychologyLiteracy.ts` | `src/psychologyLiteracy.test.ts` | Pending |
| Execution and order types | `src/executionLiteracy.ts` | `src/executionLiteracy.test.ts` | Pending |
| Market conditions | `src/marketConditionsLiteracy.ts` | `src/marketConditionsLiteracy.test.ts` | Pending |
| Asset-class literacy | `src/assetClassLiteracy.ts` | `src/assetClassLiteracy.test.ts` | Pending |
| Backtesting and evidence quality | `src/backtestingEvidenceLiteracy.ts` | `src/backtestingEvidenceLiteracy.test.ts` | Pending |
| Trade planning and no-trade decisions | `src/tradePlanLiteracy.ts` | `src/tradePlanLiteracy.test.ts` | Pending |
| Glossary | `src/glossary.ts` | `src/glossary.test.ts` | Pending |
| Adaptive practice selection | `src/AdaptivePractice.tsx` | `src/adaptivePractice.test.ts` | Pending |
| Synthetic replay | `src/ReplayLab.tsx` | `src/replayCheckpoint.test.ts` and release smoke test | Pending |
| Synthetic paper-trade simulation | `src/PaperTradeLab.tsx` | `server/src/chart-dojo.integration.test.ts` and release smoke test | Pending |
| Community challenge rubrics and publication rules | `supabase/migrations/20261012270000_community_challenge_lifecycle.sql` | `server/src/community-challenge-migration.test.ts` and two-account integration test | Pending |
| Community challenge provenance and editorial review workflow | `supabase/migrations/20261012280000_community_challenge_editorial_review.sql` | `server/src/community-editorial-migration.test.ts` and editorial admin workflow | Pending |


## Learner-facing content route coverage

These route components are part of the shipped learning experience and must remain linked to the reviewed source content above. Route-level UI changes require a relevant automated test and human editorial review before release.

| Learning route | Route component | Supporting content/test | Human editorial sign-off |
|---|---|---|---|
| Adaptive practice | `src/AdaptivePractice.tsx` | `src/adaptivePractice.test.ts` | Pending |
| Glossary | `src/GlossaryView.tsx` | `src/glossary.test.ts` | Pending |
| Candle literacy | `src/CandleLiteracyLab.tsx` | `src/candleLiteracy.test.ts` | Pending |
| Support and resistance | `src/SupportResistanceLiteracy.tsx` | `src/supportResistance.test.ts` | Pending |
| Trend structure | `src/TrendStructureLiteracy.tsx` | `src/trendStructure.test.ts` | Pending |
| Breakouts | `src/BreakoutLiteracyLab.tsx` | `src/breakoutLiteracy.test.ts` | Pending |
| Risk/reward | `src/RiskRewardLiteracyLab.tsx` | `src/riskRewardLiteracy.test.ts` | Pending |
| Leverage and margin | `src/LeverageMarginLiteracyLab.tsx` | `src/leverageMarginLiteracy.test.ts` | Pending |
| Position sizing | `src/PositionSizingLiteracyLab.tsx` | `src/positionSizingLiteracy.test.ts` | Pending |
| Drawdown | `src/DrawdownLiteracyLab.tsx` | `src/drawdownLiteracy.test.ts` | Pending |
| Trading psychology | `src/PsychologyLiteracyLab.tsx` | `src/psychologyLiteracy.test.ts` | Pending |
| Execution and order types | `src/ExecutionLiteracyLab.tsx` | `src/executionLiteracy.test.ts` | Pending |
| Market conditions | `src/MarketConditionsLiteracyLab.tsx` | `src/marketConditionsLiteracy.test.ts` | Pending |
| Backtesting and evidence | `src/BacktestingEvidenceLiteracyLab.tsx` | `src/backtestingEvidenceLiteracy.test.ts` | Pending |
| Asset-class literacy | `src/AssetClassLiteracyLab.tsx` | `src/assetClassLiteracy.test.ts` | Pending |
| Trade planning | `src/TradePlanLiteracyLab.tsx` | `src/tradePlanLiteracy.test.ts` | Pending |
| Synthetic replay | `src/ReplayLab.tsx` | `src/replayCheckpoint.test.ts` | Pending |
| Synthetic paper-trade lab | `src/PaperTradeLab.tsx` | `docs/PAPER_TRADE_LAB.md` and release smoke test | Pending |

## Editorial checklist

For each area, the reviewer should record reviewer identity, date, content version/commit, and any corrections before changing the sign-off status:

- Concepts and definitions are accurate, proportionate, and distinguish facts from heuristics.
- Risk explanations do not promise returns, encourage leverage, or imply that simulated outcomes predict future performance.
- Examples and charts are clearly identified as synthetic wherever they could be mistaken for market data.
- Correct and incorrect feedback teaches the underlying principle without presenting a single trading approach as universally correct.
- Accessibility: headings, text alternatives, non-colour cues, keyboard flow, and screen-reader announcements are usable.
- No copyrighted or licensed market data is included without documented rights.
- Every new or changed lesson has relevant automated tests and is included in this register.

Do not change “Pending” to “Approved” based solely on automated tests or an AI-generated review. Human editorial approval is a separate release gate.
