// Skill catalogue for the Chart Dojo mastery summary. Scenario ids and outcome labels
// mirror the published scenarios in supabase/migrations (006, 009, 010, 011); skillCatalogue.test.ts
// fails if the two drift apart. The first scenario of each skill is its anchor scenario.
export const SKILL_CATALOGUE = [
  {
    skillId: 'planning', label: 'Plan before entry',
    description: 'Define a reason to enter and what would invalidate the idea.',
    scenarioIds: ['TQ-SYN-001', 'TQ-SYN-004', 'TQ-SYN-005', 'TQ-SYN-010', 'TQ-SYN-013', 'TQ-SYN-019', 'TQ-SYN-020'],
    positiveOutcomes: ['disciplined'], negativeOutcomes: ['undefined-risk'],
  },
  {
    skillId: 'risk-management', label: 'Keep risk within budget',
    description: 'Size a position so a possible loss fits the stated risk budget.',
    scenarioIds: ['TQ-SYN-002', 'TQ-SYN-006', 'TQ-SYN-007', 'TQ-SYN-011', 'TQ-SYN-014', 'TQ-SYN-016', 'TQ-SYN-017', 'TQ-SYN-018', 'TQ-SYN-023', 'TQ-SYN-024'],
    positiveOutcomes: ['risk-aware'], negativeOutcomes: ['risk-exceeded'],
  },
  {
    skillId: 'evidence', label: 'Wait for evidence',
    description: 'Distinguish observable evidence from prediction or impulse.',
    scenarioIds: ['TQ-SYN-003', 'TQ-SYN-008', 'TQ-SYN-009', 'TQ-SYN-012', 'TQ-SYN-015', 'TQ-SYN-021', 'TQ-SYN-022'],
    positiveOutcomes: ['evidence-led'], negativeOutcomes: ['impulsive'],
  },
] as const;
