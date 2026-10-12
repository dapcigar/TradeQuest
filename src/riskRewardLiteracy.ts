export type RiskRewardQuestion = { id: string; prompt: string; options: Array<{ id: string; label: string }>; correctOptionId: string; explanation: string };

export const riskRewardQuestions: RiskRewardQuestion[] = [
  {
    id: 'compare-loss',
    prompt: 'A fictional plan risks £20 to potentially gain £40 before costs. What does that ratio tell you?',
    options: [
      { id: 'guarantee', label: 'The plan is likely to win because the possible gain is larger' },
      { id: 'ratio', label: 'The potential reward is twice the stated risk; it says nothing by itself about win probability' },
      { id: 'ignore', label: 'The £20 risk can be ignored if the target is reached' },
    ],
    correctOptionId: 'ratio',
    explanation: 'A 2:1 potential reward-to-risk ratio compares two amounts only. It does not establish an edge, predict a win, or include costs unless those are modelled.',
  },
  {
    id: 'win-rate',
    prompt: 'Two hypothetical methods have different win rates and average win/loss sizes. What is needed to compare them fairly?',
    options: [
      { id: 'win-rate-only', label: 'Choose the method with the higher win rate' },
      { id: 'recent-win', label: 'Choose whichever had the most recent winning example' },
      { id: 'full-sample', label: 'Review a sufficiently large sample, average wins and losses, costs, and uncertainty' },
    ],
    correctOptionId: 'full-sample',
    explanation: 'Win rate alone is incomplete. A fair evaluation considers the size and frequency of wins and losses, costs, sample size, and uncertainty; past simulated results do not guarantee future outcomes.',
  },
  {
    id: 'risk-budget',
    prompt: 'A hypothetical target looks attractive, but the planned loss exceeds your pre-set risk budget. What is the disciplined response?',
    options: [
      { id: 'increase', label: 'Increase the risk budget because the reward looks good' },
      { id: 'rework', label: 'Rework the plan so risk fits the budget, or pass' },
      { id: 'move-stop', label: 'Move the stop closer without checking whether the idea still makes sense' },
    ],
    correctOptionId: 'rework',
    explanation: 'A potential reward does not justify breaking a risk limit. Recalculate using consistent assumptions, or do not take the hypothetical setup.',
  },
];

export function assessRiskRewardAnswer(questionId: string, optionId: string) {
  const question = riskRewardQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
