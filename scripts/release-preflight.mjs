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
const appSource = read('src/App.tsx');
const styles = read('src/styles.css');
const workflow = read('.github/workflows/ci.yml');
const packageJson = JSON.parse(read('package.json'));

checkOrderedMigrationList('README.md', readme, '## Supabase setup', '## Validation');
checkOrderedMigrationList('docs/M2_IMPLEMENTATION_PLAN.md', plan, 'Current ordered migrations are:', 'The development-only seed file');

for (const [label, content, phrases] of [
  ['Release smoke test', smoke, ['Paper Trade Lab persistence and isolation', 'session event ledger', 'DELETE_MY_LEARNING_DATA', 'Security headers and abuse controls', 'weekly target']],
  ['Production readiness', readiness, ['not a global quota', 'restore', 'screen-reader', 'cross-account tests']],
  ['Production runbook', runbook, ['Backup before schema changes', 'Restore rehearsal', 'Deployment and rollback', 'Release evidence record']],
  ['Accessibility navigation', appSource, ['href="#main-content"', 'id="main-content"', 'aria-label={titleMap[view]}', 'mainContentRef.current?.focus({ preventScroll: true })', 'aria-controls="primary-navigation"', 'aria-expanded={mobileNav}', "aria-current={view === item.id ? 'page' : undefined}"]],
  ['Accessibility focus styles', styles, ['a:focus-visible', 'select:focus-visible', '.skip-link:focus', 'prefers-reduced-motion:reduce']],
  ['Accessibility manual audit', accessibility, ['Keyboard only', 'Screen reader', '200% zoom', '320 CSS-pixel viewport width']],
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
  console.log('Verified release smoke coverage, production readiness gates, runbook, CI wiring, and tracked secret/backup filename guard.');
}
