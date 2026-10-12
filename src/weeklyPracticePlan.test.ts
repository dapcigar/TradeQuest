import { describe, expect, it } from 'vitest';
import { dateKey, normaliseWeeklyPlan, weekKey } from './WeeklyPracticePlan';

describe('weekly practice plan', () => {
  it('formats the learner\'s local calendar date without a UTC day shift', () => {
    expect(dateKey(new Date(2026, 9, 12, 0, 15))).toBe('2026-10-12');
  });

  it('uses Monday as the week key, including Sundays', () => {
    expect(weekKey(new Date('2026-10-11T12:00:00Z'))).toBe('2026-10-05');
    expect(weekKey(new Date('2026-10-12T12:00:00Z'))).toBe('2026-10-12');
  });

  it('resets plans from a different week', () => {
    expect(normaliseWeeklyPlan({ week: '2026-10-05', target: 5, completedDates: ['2026-10-06'] }, '2026-10-12'))
      .toEqual({ week: '2026-10-12', target: 3, completedDates: [] });
  });

  it('accepts only supported targets and unique date-shaped completions', () => {
    expect(normaliseWeeklyPlan({ week: '2026-10-12', target: 5, completedDates: ['2026-10-12', '2026-10-12', 'bad'] }, '2026-10-12'))
      .toEqual({ week: '2026-10-12', target: 5, completedDates: ['2026-10-12'] });
    expect(normaliseWeeklyPlan({ week: '2026-10-12', target: 4, completedDates: [] }, '2026-10-12').target).toBe(3);
  });
});
