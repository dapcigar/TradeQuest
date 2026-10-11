import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMastery } from './mastery.js';
import { SKILL_CATALOGUE } from './skillCatalogue.js';

const MIGRATIONS = ['202610110006_versioned_chart_dojo_scenarios.sql', '202610110009_chart_dojo_scenario_variants.sql', '202610110010_chart_dojo_transfer_depth.sql', '202610110011_risk_budget_reasoning.sql'];
const migrationsDir = resolve(__dirname, '../../supabase/migrations');

type SeedScenario = {
  scenarioId: string; prompt: string; chartData: Record<string, unknown>;
  choices: Array<{ id: string; label: string }>;
  answerKey: Record<string, { outcome: string; feedback: string }>;
};

// Reads the seeded scenario rows straight from the migrations, so the catalogue the
// mastery summary relies on cannot drift away from what learners are actually served.
function loadSeededScenarios(): SeedScenario[] {
  const text = MIGRATIONS.map(file => readFileSync(resolve(migrationsDir, file), 'utf8')).join('\n').replace(/\r\n/g, '\n');
  const starts = [...text.matchAll(/'(TQ-SYN-\d{3})', '1'/g)];
  return starts.map((match, i) => {
    const block = text.slice(match.index, starts[i + 1]?.index ?? text.length);
    const json = [...block.matchAll(/^\s*'([[{].*)'::jsonb,?$/gm)].map(m => JSON.parse(m[1].replace(/''/g, "'")));
    // The prompt is the single-quoted line directly after the "id, version, title" line.
    const prompt = block.match(/^[^\n]*\n\s*'((?:[^'\n]|'')*)',\n/)?.[1] ?? '';
    return { scenarioId: match[1], prompt, chartData: json[0], choices: json[1], answerKey: json[2] };
  });
}

const seeded = loadSeededScenarios();
const skillOf = (scenarioId: string) => SKILL_CATALOGUE.find(skill => (skill.scenarioIds as readonly string[]).includes(scenarioId))!;
const isSound = (scenario: SeedScenario, choiceId: string) =>
  (skillOf(scenario.scenarioId).positiveOutcomes as readonly string[]).includes(scenario.answerKey[choiceId].outcome);

describe('scenario catalogue matches the seeded scenarios', () => {
  it('parses every seeded scenario', () => {
    expect(seeded).toHaveLength(18);
    for (const scenario of seeded) {
      expect(scenario.chartData).toBeTypeOf('object');
      expect(Array.isArray(scenario.choices)).toBe(true);
      expect(scenario.answerKey).toBeTypeOf('object');
    }
  });

  it('has exactly the catalogued scenario ids, each belonging to one skill', () => {
    const catalogued = SKILL_CATALOGUE.flatMap(skill => [...skill.scenarioIds]).sort();
    expect(new Set(catalogued).size).toBe(catalogued.length);
    expect(seeded.map(scenario => scenario.scenarioId).sort()).toEqual(catalogued);
  });

  it('gives every skill at least three scenarios so answers cannot simply be memorised', () => {
    for (const skill of SKILL_CATALOGUE) expect(skill.scenarioIds.length).toBeGreaterThanOrEqual(5);
  });
});

describe('scenario variation', () => {
  it('uses a different prompt for every scenario', () => {
    const prompts = seeded.map(scenario => scenario.prompt);
    expect(prompts.every(prompt => prompt.length > 20)).toBe(true);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it('does not reuse the same sound choice ids within a skill', () => {
    for (const skill of SKILL_CATALOGUE) {
      const signatures = seeded.filter(s => skillOf(s.scenarioId) === skill)
        .map(s => s.choices.filter(c => isSound(s, c.id)).map(c => c.id).sort().join('+'));
      expect(new Set(signatures).size).toBe(signatures.length);
    }
  });

  it('does not always put a sound choice first', () => {
    for (const skill of SKILL_CATALOGUE) {
      const firstIsSound = seeded.filter(s => skillOf(s.scenarioId) === skill).map(s => isSound(s, s.choices[0].id));
      expect(firstIsSound.some(Boolean)).toBe(true);
      expect(firstIsSound.some(value => !value)).toBe(true);
    }
  });

  it('labels every scenario as synthetic teaching data', () => {
    for (const scenario of seeded) expect(String(scenario.chartData.disclosure)).toMatch(/synthetic/i);
  });
});

describe('scoring consistency', () => {
  it('has an answer for every choice and no answer for a missing choice', () => {
    for (const scenario of seeded) {
      expect(Object.keys(scenario.answerKey).sort()).toEqual(scenario.choices.map(choice => choice.id).sort());
      for (const answer of Object.values(scenario.answerKey)) expect(answer.feedback.length).toBeGreaterThan(20);
    }
  });

  it('uses only the outcome labels of its own skill, with both a sound and an unsound choice', () => {
    for (const scenario of seeded) {
      const skill = skillOf(scenario.scenarioId);
      const outcomes = Object.values(scenario.answerKey).map(answer => answer.outcome);
      const allowed: string[] = [...skill.positiveOutcomes, ...skill.negativeOutcomes];
      expect(outcomes.every(outcome => allowed.includes(outcome))).toBe(true);
      expect(scenario.choices.some(choice => isSound(scenario, choice.id))).toBe(true);
      expect(scenario.choices.some(choice => !isSound(scenario, choice.id))).toBe(true);
    }
  });

  it('counts a sound answer as positive and an unsound answer as not positive in the mastery summary', () => {
    for (const scenario of seeded) {
      const skill = skillOf(scenario.scenarioId);
      for (const [choiceId, answer] of Object.entries(scenario.answerKey)) {
        const row = buildMastery([{ scenario_id: scenario.scenarioId, outcome: answer.outcome }])
          .skills.find(item => item.skillId === skill.skillId)!;
        expect(row.positiveDecisions, `${scenario.scenarioId}/${choiceId}`).toBe(isSound(scenario, choiceId) ? 1 : 0);
      }
    }
  });

  it('keeps risk-budget figures consistent with the stated budget', () => {
    // Migration 009 corrects TQ-SYN-002's Plan A; apply that correction before checking.
    const correction = readFileSync(resolve(migrationsDir, MIGRATIONS[1]), 'utf8').match(/'(\{"id":"A","stopDistance":\d+,"estimatedLoss":\d+\})'::jsonb\)\s*where scenario_id = 'TQ-SYN-002'/);
    expect(correction).not.toBeNull();
    const budgetScenarios = seeded.filter(s => s.chartData.kind === 'risk-budget-comparison');
    expect(budgetScenarios.length).toBeGreaterThanOrEqual(5);
    for (const scenario of budgetScenarios) {
      const budget = Number(scenario.chartData.accountEquity) * Number(scenario.chartData.riskBudgetPercent) / 100;
      const plans = [...(scenario.chartData.plans as Array<{ id: string; estimatedLoss: number }>)];
      if (scenario.scenarioId === 'TQ-SYN-002') plans[0] = JSON.parse(correction![1]);
      expect(plans.some(plan => plan.estimatedLoss <= budget), scenario.scenarioId).toBe(true);
      expect(plans.some(plan => plan.estimatedLoss > budget), scenario.scenarioId).toBe(true);
    }
  });
});
