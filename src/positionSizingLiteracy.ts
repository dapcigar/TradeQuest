export type PositionSizingQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

export const positionSizingQuestions: PositionSizingQuestion[] = [
  {
    id: 'budget-first',
    prompt: 'A fictional account has £2,000 of equity and a pre-set 1% risk budget. What is the planned cash risk before costs?',
    options: [
      { id: '20', label: '£20 — one per cent of £2,000' },
      { id: '200', label: '£200 — ten per cent of £2,000' },
      { id: 'any', label: 'Whatever amount feels reasonable after seeing the chart' },
    ],
    correctOptionId: '20',
    explanation: 'One per cent of £2,000 is £20. This is a planning limit, not a guarantee that the realised loss cannot be larger.',
  },
  {
    id: 'stop-distance',
    prompt: 'If the cash risk budget stays the same but the stop distance becomes wider, what generally happens to the allowed position size?',
    options: [
      { id: 'larger', label: 'It should become larger to keep the idea worthwhile' },
      { id: 'smaller', label: 'It should become smaller to keep planned risk within budget' },
      { id: 'same', label: 'It must stay exactly the same' },
    ],
    correctOptionId: 'smaller',
    explanation: 'With the same cash risk budget, a wider stop generally means a smaller position. The actual calculation depends on the instrument’s contract and value specifications.',
  },
  {
    id: 'instrument-spec',
    prompt: 'You know the stop distance, but do not know the instrument’s contract size or value per price movement. What is the safest next step?',
    options: [
      { id: 'guess', label: 'Guess a familiar forex pip value and continue' },
      { id: 'max', label: 'Use the maximum position size allowed by the platform' },
      { id: 'verify', label: 'Verify instrument specifications and costs, or do not calculate a size yet' },
    ],
    correctOptionId: 'verify',
    explanation: 'Pip, tick, contract, and currency-conversion rules differ across instruments. If those inputs are unknown, a precise position-size result would be misleading.',
  },
];

export function assessPositionSizingAnswer(questionId: string, optionId: string) {
  const question = positionSizingQuestions.find(item => item.id === questionId);
  const optionExists = question?.options.some(option => option.id === optionId);
  if (!question || !optionExists) return null;
  return {
    correct: optionId === question.correctOptionId,
    explanation: question.explanation,
  };
}
