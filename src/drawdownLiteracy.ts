export type DrawdownQuestion = { id: string; prompt: string; options: Array<{ id: string; label: string }>; correctOptionId: string; explanation: string };

export function calculateDrawdown(startingEquity: number, currentEquity: number) {
  if (!Number.isFinite(startingEquity) || !Number.isFinite(currentEquity) || startingEquity <= 0 || currentEquity < 0 || currentEquity > startingEquity) return null;
  const amount = startingEquity - currentEquity;
  const percent = amount / startingEquity * 100;
  const recoveryPercent = currentEquity === 0 ? null : amount / currentEquity * 100;
  return { amount, percent, recoveryPercent };
}

export const drawdownQuestions: DrawdownQuestion[] = [
  {
    id: 'drawdown-measure',
    prompt: 'A fictional account falls from £1,000 to £900. What is the drawdown from its previous high?',
    options: [
      { id: '10-percent', label: '£100, or 10% of the previous £1,000 high' },
      { id: '11-percent', label: '£100, or 11.1% of the previous £1,000 high' },
      { id: 'zero', label: 'No drawdown unless the account is closed' },
    ],
    correctOptionId: '10-percent',
    explanation: 'Drawdown compares a decline with the prior peak: £100 divided by £1,000 is 10%.',
  },
  {
    id: 'recovery-asymmetry',
    prompt: 'After that £1,000 account falls to £900, what percentage gain on £900 would return it to £1,000 before costs?',
    options: [
      { id: '10-percent', label: '10%, because the loss was 10%' },
      { id: '11-1-percent', label: 'About 11.1%, because the gain is measured from £900' },
      { id: 'same-amount', label: 'Any small positive gain will restore the account' },
    ],
    correctOptionId: '11-1-percent',
    explanation: 'The £100 needed recovery is 100/900 ≈ 11.1%. Loss and recovery percentages use different bases.',
  },
  {
    id: 'loss-streak',
    prompt: 'Several simulated decisions lose in a row. What is the soundest response?',
    options: [
      { id: 'increase-size', label: 'Increase size to recover the losses quickly' },
      { id: 'assume-reversal', label: 'Assume the next decision is more likely to win' },
      { id: 'pause-review', label: 'Pause, review the process and risk limits, and avoid revenge trading' },
    ],
    correctOptionId: 'pause-review',
    explanation: 'A losing streak alone does not prove the next outcome is due to reverse. Review the evidence and follow predefined risk limits.',
  },
];

export function assessDrawdownAnswer(questionId: string, optionId: string) {
  const question = drawdownQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
