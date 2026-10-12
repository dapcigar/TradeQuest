export type LeverageQuestion = { id: string; prompt: string; options: Array<{ id: string; label: string }>; correctOptionId: string; explanation: string };

export const leverageQuestions: LeverageQuestion[] = [
  {
    id: 'exposure',
    prompt: 'A fictional account has £1,000 of its own funds and controls £5,000 of market exposure. What does 5:1 leverage describe?',
    options: [
      { id: 'profit', label: 'A five-times increase in the chance of making a profit' },
      { id: 'exposure', label: 'Exposure is five times the account funds; gains and losses can both be magnified' },
      { id: 'loss-cap', label: 'The maximum possible loss is limited to £1,000' },
    ],
    correctOptionId: 'exposure',
    explanation: 'Leverage compares exposure with the funds supporting it. It does not improve the probability of success or guarantee that losses stop at the amount deposited.',
  },
  {
    id: 'margin',
    prompt: 'A platform says a hypothetical position requires margin. What is margin?',
    options: [
      { id: 'fee', label: 'A fee that is always refunded with no conditions' },
      { id: 'buffer', label: 'Funds set aside as collateral to support an open position' },
      { id: 'risk-limit', label: 'A guaranteed maximum loss for the position' },
    ],
    correctOptionId: 'buffer',
    explanation: 'Margin is collateral required to maintain exposure under a product’s rules. It is not the same as the maximum loss, and margin requirements can change.',
  },
  {
    id: 'response',
    prompt: 'A fictional leveraged position moves against the learner and available margin falls. What is the safest learning response?',
    options: [
      { id: 'add', label: 'Add more exposure automatically to recover the loss' },
      { id: 'ignore', label: 'Ignore margin because the original idea may still work' },
      { id: 'review', label: 'Review the product rules, total exposure, and possible loss; do not add risk impulsively' },
    ],
    correctOptionId: 'review',
    explanation: 'Leverage can make losses accumulate quickly and may trigger a margin close-out under product rules. Review the full risk and avoid adding exposure just to chase a recovery.',
  },
];

export function assessLeverageAnswer(questionId: string, optionId: string) {
  const question = leverageQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
