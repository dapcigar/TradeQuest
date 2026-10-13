import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = path => {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    failures.push('Missing required file: ' + path);
    return '';
  }
  return readFileSync(fullPath, 'utf8');
};

const migrationDir = join(root, 'supabase/migrations');
const actualFiles = readdirSync(migrationDir).filter(file => file.endsWith('.sql')).sort();
const expectedPaths = actualFiles.map(file => 'supabase/migrations/' + file);

function checkOrderedMigrationList(label, content, startMarker, endMarker) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    failures.push(label + ': migration list section markers are missing.');
    return;
  }
  const section = content.slice(start, end);
  const paths = [...section.matchAll(/supabase\/migrations\/([^\s`]+\.sql)/g)]
    .map(match => 'supabase/migrations/' + match[1]);
  const duplicates = paths.filter((path, index) => paths.indexOf(path) !== index);
  if (duplicates.length) failures.push(label + ': duplicate migration entries: ' + [...new Set(duplicates)].join(', '));
  const missing = expectedPaths.filter(path => !paths.includes(path));
  const unknown = paths.filter(path => !expectedPaths.includes(path));
  if (missing.length) failures.push(label + ': missing migrations: ' + missing.join(', '));
  if (unknown.length) failures.push(label + ': references files that do not exist: ' + [...new Set(unknown)].join(', '));
  if (JSON.stringify(paths) !== JSON.stringify(expectedPaths)) {
    failures.push(label + ': migration entries must appear once each in lexicographic filename order.');
  }
}

const readme = read('README.md');
const plan = read('docs/M2_IMPLEMENTATION_PLAN.md');
const smoke = read('docs/RELEASE_SMOKE_TEST.md');
const readiness = read('docs/PRODUCTION_READINESS.md');
const runbook = read('docs/PRODUCTION_RUNBOOK.md');
const accessibility = read('docs/ACCESSIBILITY.md');
const contentRegister = read('docs/CONTENT_REVIEW_REGISTER.md');
const contentReviewRegisterTests = read('src/contentReviewRegister.test.ts');
const appSource = read('src/App.tsx');
const appCodeSplittingTests = read('src/appCodeSplitting.test.ts');
const routeErrorBoundary = read('src/LearningRouteErrorBoundary.tsx');
const routeErrorBoundaryTests = read('src/learningRouteErrorBoundary.test.ts');
const styles = read('src/styles.css');
const riskSource = read('src/risk.ts');
const riskTests = read('src/risk.test.ts');
const calendarDateKey = read('src/dateKey.ts');
const calendarDateKeyTests = read('src/dateKey.test.ts');
const learningImport = read('src/learningImport.ts');
const learningImportTests = read('src/learningImport.test.ts');
const weeklyPracticePlanUi = read('src/WeeklyPracticePlan.tsx');
const weeklyPracticePlanTests = read('src/weeklyPracticePlan.test.ts');
const workflow = read('.github/workflows/ci.yml');
const integrationWorkflow = read('.github/workflows/integration.yml');
const legacySupabaseIntegrationWorkflow = read('.github/workflows/supabase-integration.yml');
const paperFillMigration = read('supabase/migrations/20261012250000_paper_trade_fill_ledger.sql');
const paperFillContractTests = read('server/src/paper-trade-fill-migration.test.ts');
const communityProfileMigration = read('supabase/migrations/20261012260000_community_profiles.sql');
const communityProfileContractTests = read('server/src/community-profile-migration.test.ts');
const communityProfileUi = read('src/CommunityProfile.tsx');
const communityProfileApi = read('server/src/index.ts');
const communityChallengeMigration = read('supabase/migrations/20261012270000_community_challenge_lifecycle.sql');
const communityChallengeContractTests = read('server/src/community-challenge-migration.test.ts');
const communityChallengesUi = read('src/CommunityChallenges.tsx');
const communityModerationDocs = read('docs/COMMUNITY_MODERATION.md');
const masteryCore = read('server/src/mastery.ts');
const masteryCoreTests = read('server/src/mastery.test.ts');
const masteryHistoryHelper = read('server/src/masteryHistory.ts');
const masteryHistoryTests = read('server/src/masteryHistory.test.ts');
const adaptivePracticeUi = read('src/AdaptivePractice.tsx');
const masteryApi = read('server/src/index.ts');
const communityEditorialMigration = read('supabase/migrations/20261012280000_community_challenge_editorial_review.sql');
const communityModerationHistoryMigration = read('supabase/migrations/20261013060000_community_moderation_history.sql');
const communityModerationHistoryContractTests = read('server/src/community-moderation-history-migration.test.ts');
const communityEditorialHistoryMigration = read('supabase/migrations/20261013070000_community_editorial_history.sql');
const communityEditorialHistoryContractTests = read('server/src/community-editorial-history-migration.test.ts');
const communityChallengeProposalMigration = read('supabase/migrations/20261013080000_community_challenge_proposals.sql');
const communityChallengeProposalContractTests = read('server/src/community-challenge-proposals-migration.test.ts');
const privateProposalQueueMigration = read('supabase/migrations/20261013090000_hide_unsubmitted_challenge_drafts.sql');
const privateProposalQueueTests = read('server/src/community-challenge-proposal-queue-migration.test.ts');
const serverOwnedProposalOutcomeMigration = read('supabase/migrations/20261013100000_server_own_proposal_outcome.sql');
const serverOwnedProposalOutcomeTests = read('server/src/community-challenge-proposal-outcome-migration.test.ts');
const challengeProposalDataLifecycleMigration = read('supabase/migrations/20261013110000_challenge_proposal_data_lifecycle.sql');
const challengeProposalDataLifecycleTests = read('server/src/community-challenge-proposal-data-lifecycle.test.ts');
const apiSchemas = read('server/src/schemas.ts');
const apiSchemaTests = read('server/src/schemas.test.ts');
const apiSmokeRoutes = read('scripts/api-smoke-lib.mjs');
const apiSmokeWorkflow = read('.github/workflows/api-smoke.yml');
const apiSmokeWorkflowTests = read('scripts/api-smoke-workflow.test.ts');
const communityEditorialContractTests = read('server/src/community-editorial-migration.test.ts');
const paperExecutionMigration = read('supabase/migrations/20261012290000_paper_trade_execution_assumptions.sql');
const paperExecutionContractTests = read('server/src/paper-trade-execution-assumptions.test.ts');
const paperTradeUi = read('src/PaperTradeLab.tsx');
const apiIntegrationTests = read('server/src/chart-dojo.integration.test.ts');
const packageJson = JSON.parse(read('package.json'));
const packageLock = read('package-lock.json');

checkOrderedMigrationList('README.md', readme, '## Supabase setup', '## Validation');
checkOrderedMigrationList('docs/M2_IMPLEMENTATION_PLAN.md', plan, 'Current ordered migrations are:', 'The development-only seed file');

const curriculumModules = [
  ['Core learning catalogue', 'src/learning.ts', 'src/learning.test.ts'],
  ['Candle literacy', 'src/candleLiteracy.ts', 'src/candleLiteracy.test.ts'],
  ['Support and resistance', 'src/supportResistance.ts', 'src/supportResistance.test.ts'],
  ['Trend structure', 'src/trendStructure.ts', 'src/trendStructure.test.ts'],
  ['Breakouts', 'src/breakoutLiteracy.ts', 'src/breakoutLiteracy.test.ts'],
  ['Risk/reward', 'src/riskRewardLiteracy.ts', 'src/riskRewardLiteracy.test.ts'],
  ['Leverage and margin', 'src/leverageMarginLiteracy.ts', 'src/leverageMarginLiteracy.test.ts'],
  ['Position sizing', 'src/positionSizingLiteracy.ts', 'src/positionSizingLiteracy.test.ts'],
  ['Drawdown', 'src/drawdownLiteracy.ts', 'src/drawdownLiteracy.test.ts'],
  ['Trading psychology', 'src/psychologyLiteracy.ts', 'src/psychologyLiteracy.test.ts'],
  ['Execution', 'src/executionLiteracy.ts', 'src/executionLiteracy.test.ts'],
  ['Market conditions', 'src/marketConditionsLiteracy.ts', 'src/marketConditionsLiteracy.test.ts'],
  ['Asset classes', 'src/assetClassLiteracy.ts', 'src/assetClassLiteracy.test.ts'],
  ['Backtesting evidence', 'src/backtestingEvidenceLiteracy.ts', 'src/backtestingEvidenceLiteracy.test.ts'],
  ['Trade planning', 'src/tradePlanLiteracy.ts', 'src/tradePlanLiteracy.test.ts'],
  ['Glossary', 'src/glossary.ts', 'src/glossary.test.ts'],
  ['Adaptive practice', 'src/AdaptivePractice.tsx', 'src/adaptivePractice.test.ts'],
  ['Synthetic replay', 'src/ReplayLab.tsx', 'src/replayCheckpoint.test.ts'],
  ['Synthetic paper trade', 'src/PaperTradeLab.tsx', 'server/src/chart-dojo.integration.test.ts'],
  ['Community challenge rubrics', 'supabase/migrations/20261012270000_community_challenge_lifecycle.sql', 'server/src/community-challenge-migration.test.ts'],
  ['Community challenge editorial review', 'supabase/migrations/20261012280000_community_challenge_editorial_review.sql', 'server/src/community-editorial-migration.test.ts'],
];

for (const [label, sourcePath, testPath] of curriculumModules) {
  const source = read(sourcePath);
  read(testPath);
  if (!contentRegister.includes(sourcePath) || !contentRegister.includes(testPath)) {
    failures.push('Content review register is missing source/test coverage for ' + label + '.');
  }
  if (/\b(?:TODO|TBD|FIXME|Lorem ipsum|placeholder text)\b/i.test(source)) {
    failures.push(label + ': placeholder content marker found in ' + sourcePath + '.');
  }
}
for (const path of ['src/AdaptivePractice.tsx', 'src/ReplayLab.tsx', 'src/PaperTradeLab.tsx']) {
  if (!/\bsynthetic\b/i.test(read(path))) failures.push(path + ': explicit synthetic-data disclosure is missing.');
}

for (const [label, content, phrases] of [
  ['Reproducible npm lockfile and patched test runner', packageLock, ['"lockfileVersion": 3', '"vitest": "^4.1.11"', '"vite": "^6.4.4"']],
  ['Release smoke test', smoke, ['Paper Trade Lab persistence and isolation', 'session event ledger', 'DELETE_MY_LEARNING_DATA', 'Security headers and abuse controls', 'weekly target']],
  ['Manual deployed API smoke workflow', apiSmokeWorkflow + apiSmokeWorkflowTests + runbook + readme, ['workflow_dispatch:', 'confirm_no_write_smoke', 'vars.TRADEQUEST_SMOKE_API_URL', 'npm run api:smoke', 'does not run Supabase integration tests']],
  ['Production readiness', readiness, ['not a global quota', 'restore', 'screen-reader', 'cross-account tests', 'editorial approval', 'CONTENT_REVIEW_REGISTER.md']],
  ['Production runbook', runbook, ['Backup before schema changes', 'Restore rehearsal', 'Deployment and rollback', 'Release evidence record']],
  ['Accessibility navigation', appSource, ['href="#main-content"', 'id="main-content"', 'aria-label={titleMap[view]}', 'mainContentRef.current?.focus({ preventScroll: true })', 'aria-controls="primary-navigation"', 'aria-expanded={mobileNav}', "aria-current={view === item.id ? 'page' : undefined}"]],
  ['Accessibility focus styles', styles, ['a:focus-visible', 'select:focus-visible', '.skip-link:focus', 'prefers-reduced-motion:reduce']],
  ['Accessibility manual audit', accessibility, ['Keyboard only', 'Screen reader', '200% zoom', '320 CSS-pixel viewport width']],
  ['Route-level code splitting', appSource + appCodeSplittingTests, ["lazy(() => import('./PaperTradeLab'))", "lazy(() => import('./CommunityChallenges'))", 'Loading learning module', 'loads heavy learning routes on demand']],
  ['Learning route loading recovery', appSource + routeErrorBoundary + routeErrorBoundaryTests + accessibility, ['LearningRouteErrorBoundary', 'This learning module could not load', 'Reload TradeQuest', 'role="alert"', 'failed to render', 'failed route chunk']],
  ['Risk calculator numeric bounds', riskSource, ['Number.isFinite', 'safe numeric range']],
  ['Risk calculator regression tests', riskTests, ['Number.MAX_VALUE', 'Number.MIN_VALUE', 'ratios that overflow']],
  ['Calendar date validation and learning-data imports', calendarDateKey + calendarDateKeyTests + learningImport + learningImportTests + weeklyPracticePlanUi + weeklyPracticePlanTests, ['isValidDateKey', '2026-02-30', '2026-04-31', 'rejects impossible calendar dates', 'drops impossible calendar dates']],
  ['Content review register', contentRegister, ['Human editorial approval', 'Editorial checklist', 'Do not change']],
  ['Curriculum route review coverage', contentRegister + appSource + contentReviewRegisterTests, ['Learner-facing content route coverage', 'src/PaperTradeLab.tsx', 'src/AdaptivePractice.tsx', 'registers every learner-facing curriculum route component', 'keeps human editorial sign-off explicitly pending']],
  ['Paper trade fill ledger', paperFillMigration, ['create table if not exists public.paper_trade_fills', 'enable row level security', 'revoke all on public.paper_trade_fills', 'unique (session_id, fill_sequence)', 'on conflict (session_id, fill_type) do nothing', 'paper_trade_fills_on_session_change']],
  ['Paper trade fill-ledger contract tests', paperFillContractTests, ['learner roles and scoped by owner RLS', 'direction-correct sides', 'closing transaction if required outcome fields are missing', 'backfills existing open and closed sessions']],
  ['Opt-in community profile migration', communityProfileMigration, ['is_public boolean not null default false', 'enable row level security', 'Learners read public community profiles', 'get_my_community_profile', 'save_my_community_profile', 'delete_my_community_profile', 'community_profiles_handle_ci_unique']],
  ['Community profile migration contract tests', communityProfileContractTests, ['defaults profiles to private', 'owner-scoped RLS', 'limits public identity fields']],
  ['Community profile UI privacy disclosures', communityProfileUi, ['Profiles are opt-in', 'Your learning progress, decision journal, account details, virtual balances and trading history are never included', 'Only your handle, display name and bio are shown', 'No public progress scores, balances, journals, contact details']],
  ['Community profile API routes', communityProfileApi, ["app.get('/v1/community/profile'", "app.post('/v1/community/profile'", "app.delete('/v1/community/profile'", "app.get('/v1/community/profiles'", 'communityProfileSchema.safeParse']],
  ['Community challenge lifecycle migration', communityChallengeMigration, ['create table if not exists public.community_challenges', 'create table if not exists public.community_challenge_entries', 'create table if not exists public.community_reports', 'create table if not exists public.community_moderation_actions', 'submit_community_challenge_entry', 'moderate_community_challenge_entry', 'community_moderation_actions', 'delete_own_learning_data']],
  ['Community challenge migration contract tests', communityChallengeContractTests, ['server-scored attempts', 'public entries hidden until approval', 'audit trail']],
  ['Community challenge UI safety controls', communityChallengesUi, ['PROCESS · NOT P/L', 'queued for moderator review', 'Report entry', 'Moderator queue', 'Your original practice attempt will remain']],
  ['Community moderation runbook', communityModerationDocs, ['REPLACE_WITH_VERIFIED_AUTH_USER_UUID', 'assign a moderator automatically', 'no direct messages', 'trusted moderator is provisioned']],
  ['Complete mastery history pagination', masteryHistoryHelper, ['collectAllPages', 'Invalid page size.']],
  ['Mastery pagination regression tests', masteryHistoryTests, ['across page boundaries', 'does not return a partial history', 'invalid page sizes']],
  ['Mastery large-history safety', masteryCore + masteryCoreTests, ['timestamps.reduce<number | null>', 'large retained histories without argument-count overflow', '150_000']],
  ['Mastery API all-retained-history contract', masteryApi, ["historyScope: 'all-retained-server-attempts'", 'historyComplete: true', "attempts/adaptive-summary", "historyScope: 'all-retained-adaptive-attempts'", 'Complete mastery history could not be loaded']],
  ['Adaptive Practice aggregate evidence contract', adaptivePracticeUi, ['nextAdaptiveVariantFromSummary', 'adaptiveEvidenceFromSummary', 'historyComplete !== true']],
  ['Challenge editorial provenance and publication gate', communityEditorialMigration, ['source_reference text not null', 'editorial_status text not null default \'draft\'', 'is_community_admin', 'community_challenge_reviews', 'editorial_status in (\'approved\', \'legacy-published\')']],
  ['Challenge editorial migration tests', communityEditorialContractTests, ['records provenance', 'requires an admin role', 'hides draft, rejected and retired content']],
  ['Community moderation history migration', communityModerationHistoryMigration, ['create or replace function public.list_community_moderation_history()', 'is_community_moderator()', 'limit 100', 'revoke all on function public.list_community_moderation_history()', 'grant execute on function public.list_community_moderation_history()']],
  ['Community moderation history contract tests', communityModerationHistoryContractTests, ['limits history access', 'newest-first', 'moderator identifiers']],
  ['Community editorial history migration', communityEditorialHistoryMigration, ['create or replace function public.list_community_challenge_review_history()', 'is_community_admin()', 'limit 100', 'revoke all on function public.list_community_challenge_review_history()', 'grant execute on function public.list_community_challenge_review_history()']],
  ['Community editorial history contract tests', communityEditorialHistoryContractTests, ['requires an authenticated community admin', 'newest-first', 'reviewer identifiers']],
  ['Learner-authored challenge proposal migration', communityChallengeProposalMigration + communityChallengeProposalContractTests, ['create_community_challenge_draft', 'list_my_community_challenge_proposals', 'published = false', 'only draft proposals can be edited']],
  ['Private challenge proposal queue migration', privateProposalQueueMigration + privateProposalQueueTests, ['create or replace function public.list_community_editorial_queue()', 'c.created_by is null or c.editorial_status <> \'draft\'', 'keeps unsubmitted learner drafts out of the editorial queue']],
  ['Server-owned challenge proposal outcomes', serverOwnedProposalOutcomeMigration + serverOwnedProposalOutcomeTests + apiSchemas + apiSchemaTests + communityChallengesUi + communityProfileApi + communityModerationDocs + readiness + smoke + readme + plan, ['create or replace function public.list_community_challenges()', 'select c.positive_outcome into v_positive_outcome', 'removes the outcome from public challenge payloads', 'server-owned challenge proposal outcome migration', '20261013100000_server_own_proposal_outcome.sql']],
  ['Challenge proposal export/deletion lifecycle', challengeProposalDataLifecycleMigration + challengeProposalDataLifecycleTests + communityProfileApi + readiness + smoke + readme + plan, ['communityChallengeProposalsDeleted', 'communityChallengeProposalsRedacted', 'communityChallengeProposals:', 'list_my_community_challenge_proposals', '20261013110000_challenge_proposal_data_lifecycle.sql']],
  ['Challenge proposal API/UI/schema contract', communityChallengesUi + communityProfileApi + apiSchemas + apiSchemaTests + apiSmokeRoutes, ["app.post('/v1/community/challenges/proposals'", "app.patch('/v1/community/challenges/proposals/:id'", "app.post('/v1/community/challenges/proposals/:id/submit'", 'Create a challenge proposal', 'communityChallengeProposalSchema', "['PATCH', '/v1/community/challenges/proposals/' + exampleId]"]],
  ['Editorial admin UI and routes', communityChallengesUi + communityProfileApi, ['Editorial review queue', 'Approve &amp; publish', "app.get('/v1/community/editorial/queue'", "app.post('/v1/community/editorial/:id/review'"]],
  ['Editorial review runbook', communityModerationDocs, ['source reference', 'Only a community admin', 'community_challenge_reviews', 'increment `content_version`']],
  ['Community moderation history API/UI/docs', communityChallengesUi + communityProfileApi + communityModerationDocs, ["app.get('/v1/community/moderation/history'", 'Recent moderation history', 'latest 100 moderation decisions', '20261013060000_community_moderation_history.sql']],
  ['Community editorial history API/UI/docs', communityChallengesUi + communityProfileApi + communityModerationDocs + readiness + smoke, ["app.get('/v1/community/editorial/history'", 'Recent editorial decisions', 'latest 100 editorial decisions', '20261013070000_community_editorial_history.sql']],
  ['Community challenge proposal release gates', communityChallengeProposalMigration + communityModerationDocs + readiness + smoke + readme + plan, ['Learner-authored proposal submitted in TradeQuest', '20261013080000_community_challenge_proposals.sql', 'revision request returns it to an editable draft']],
  ['Paper-trade execution assumptions migration', paperExecutionMigration, ['tick_size numeric not null default 1', 'estimated_stop_loss', 'margin_required', 'start_paper_trade_session_with_specs', 'v_exit_fill_price', 'exclude adverse gap-through']],
  ['Paper-trade execution assumptions tests', paperExecutionContractTests, ['bounded user-defined execution assumptions', 'lot step and limits risk and margin', 'effective fill prices']],
  ['Paper-trade execution UI/API contract', paperTradeUi + masteryApi, ['Execution assumptions', 'estimatedStopLoss', 'marginRequired', 'start_paper_trade_session_with_specs']],
  ['Paper-trade custom-cost integration coverage', apiIntegrationTests, ['sizes positions by user-defined tick', 'estimatedStopLoss: 98.4', 'marginRequired: 422.3', '104.625']],
  ['Connected Supabase integration workflow', integrationWorkflow, ['workflow_dispatch', 'confirm_test_accounts', 'Require explicit dedicated-test-account confirmation', 'Validate dedicated account tokens against deployed API', '/v1/me/progress', 'No integration writes have been started', 'TRADEQUEST_TEST_API_URL', 'TRADEQUEST_TEST_USER_A_TOKEN', 'TRADEQUEST_TEST_USER_B_TOKEN', 'npm ci', 'npm audit --audit-level=high', 'npm run test -- server/src/chart-dojo.integration.test.ts', 'deletes all saved learning data for Account A']],
  ['Legacy Supabase integration workflow safeguards', legacySupabaseIntegrationWorkflow, ['confirm_test_accounts', 'Require explicit dedicated-test-account confirmation', 'Validate both dedicated accounts against deployed API', '/v1/me/progress', 'No integration writes have been started', 'npm ci', 'npm audit --audit-level=high', 'npm run test -- server/src/chart-dojo.integration.test.ts --reporter=verbose']],
]) {
  const lower = content.toLowerCase();
  const missing = phrases.filter(phrase => !lower.includes(phrase.toLowerCase()));
  if (missing.length) failures.push(label + ': missing release coverage: ' + missing.join(', '));
}

if (packageJson.scripts?.['release:preflight'] !== 'node scripts/release-preflight.mjs') {
  failures.push('package.json must expose npm run release:preflight.');
}
if (!workflow.includes('npm run release:preflight')) {
  failures.push('GitHub Actions must run npm run release:preflight.');
}

try {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const sensitive = tracked.filter(path =>
    /(^|\/)\.env(?:\.(?!example$|template$)[^/]+)?$/i.test(path) ||
    /\.(?:dump|backup|sql\.gz)$/i.test(path)
  );
  if (sensitive.length) failures.push('Potentially sensitive environment/backup files are tracked: ' + sensitive.join(', '));
} catch {
  failures.push('Could not inspect tracked files for committed environment or backup artifacts.');
}

if (failures.length) {
  console.error('TradeQuest release preflight FAILED');
  for (const failure of failures) console.error('- ' + failure);
  process.exitCode = 1;
} else {
  console.log('TradeQuest release preflight passed.');
  console.log('Verified ' + actualFiles.length + ' migration files are listed once, in filename order, in README and the M2 plan.');
  console.log('Verified release smoke coverage, production readiness gates, recovery runbook, accessibility semantics, curriculum source/test coverage, synthetic labels, CI and connected-Supabase test-account integration wiring, and tracked secret/backup filename guard.');
}
