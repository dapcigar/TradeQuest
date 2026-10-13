import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(resolve(process.cwd(), '.github/workflows/api-smoke.yml'), 'utf8');

describe('deployed API smoke workflow contract', () => {
  it('is manually triggered and requires explicit no-write confirmation', () => {
    expect(workflow).toMatch(/workflow_dispatch:/);
    expect(workflow).toMatch(/confirm_no_write_smoke:/);
    expect(workflow).toMatch(/inputs\.confirm_no_write_smoke/);
  });

  it('uses only the configured API URL and the unauthenticated smoke script', () => {
    expect(workflow).toContain('vars.TRADEQUEST_SMOKE_API_URL');
    expect(workflow).toContain('npm run api:smoke');
    expect(workflow).toContain('must use HTTPS');
    expect(workflow).not.toMatch(/TRADEQUEST_TEST_USER_[AB]_TOKEN/);
    expect(workflow).not.toMatch(/integration\.test\.ts/);
  });
});
