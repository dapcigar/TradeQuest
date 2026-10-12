export type StructureOption = { id: string; label: string };
export type StructureQuestion = {
  id: string;
  prompt: string;
  options: StructureOption[];
  correctOptionId: string;
  explanation: string;
};

export const structureQuestions: StructureQuestion[] = [
  {
    id: 'zones',
    prompt: 'How should a beginner think about support and resistance?',
    options: [
      { id: 'exact', label: 'Exact prices where a reversal is guaranteed' },
      { id: 'zones', label: 'Areas where price has previously struggled or reacted' },
      { id: 'signals', label: 'Automatic buy and sell signals' },
    ],
    correctOptionId: 'zones',
    explanation: 'These are areas of interest, not precise barriers. Price can pass through them, and past reactions do not guarantee another reaction.',
  },
  {
    id: 'touches',
    prompt: 'Price has reacted near the same area several times. What does that prove?',
    options: [
      { id: 'certain', label: 'The next reaction is certain to happen' },
      { id: 'trend', label: 'The market direction is now confirmed' },
      { id: 'context', label: 'Only that the area has mattered before; future behaviour remains uncertain' },
    ],
    correctOptionId: 'context',
    explanation: 'Previous reactions are context, not a promise. Consider the wider structure, fresh evidence, and what would invalidate your idea.',
  },
  {
    id: 'breakout',
    prompt: 'A candle moves above a resistance zone. Which conclusion is most defensible?',
    options: [
      { id: 'guaranteed', label: 'A new uptrend is guaranteed; enter immediately' },
      { id: 'observe', label: 'It may be a breakout, but one candle alone does not confirm continuation' },
      { id: 'ignore', label: 'The zone can never matter again' },
    ],
    correctOptionId: 'observe',
    explanation: 'A move through a zone can fail or continue. Avoid certainty, seek a defined reason to act, and set an invalidation condition before considering risk.',
  },
];

export function assessStructureAnswer(questionId: string, optionId: string): { correct: boolean; explanation: string } | null {
  const question = structureQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
