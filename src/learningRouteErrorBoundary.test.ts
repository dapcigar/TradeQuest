import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
const boundary = readFileSync(resolve(process.cwd(), 'src/LearningRouteErrorBoundary.tsx'), 'utf8');

describe('learning route loading recovery', () => {
  it('wraps lazy route rendering in an error boundary outside Suspense', () => {
    expect(app).toContain("import LearningRouteErrorBoundary from './LearningRouteErrorBoundary';");
    expect(app).toMatch(/<LearningRouteErrorBoundary>\s*<Suspense[\s\S]*?<\/Suspense>\s*<\/LearningRouteErrorBoundary>/);
  });

  it('provides an accessible recovery message and reload action without exposing internal errors', () => {
    expect(boundary).toContain('role="alert"');
    expect(boundary).toContain('aria-labelledby="module-load-error-title"');
    expect(boundary).toContain('Reload TradeQuest');
    expect(boundary).toContain('window.location.reload()');
    expect(boundary).not.toContain('error.message');
    expect(boundary).not.toContain('this.props');
  });

  it('keeps diagnostics minimal and avoids learner content or props', () => {
    expect(boundary).toContain("console.error('A learning route failed to render.', { name: error.name })");
    expect(boundary).not.toContain('console.error(error');
  });
});
