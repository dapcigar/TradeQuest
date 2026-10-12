export type TrendOption = { id: string; label: string };
export type TrendQuestion = {
  id: string;
  prompt: string;
  options: TrendOption[];
  correctOptionId: string;
  explanation: string;
};

export const trendQuestions: TrendQuestion[] = [
  {
    id: 'rising',
    prompt: 'A synthetic chart repeatedly forms higher swing highs and higher swing lows. What is the most careful description?',
    options: [
      { id: 'guaranteed', label: 'Price must keep rising, so a long trade is certain to work' },
      { id: 'up-structure', label: 'The observed swing structure is upward, but it can change' },
      { id: 'range', label: 'It is definitely moving sideways' },
    ],
    correctOptionId: 'up-structure',
    explanation: 'Higher highs and higher lows describe an upward structure in the observations shown. They do not guarantee continuation or make a trade safe.',
  },
  {
    id: 'falling',
    prompt: 'A chart makes lower swing highs and lower swing lows. What can you infer from that pattern?',
    options: [
      { id: 'down-structure', label: 'The observed swing structure is downward; future movement remains uncertain' },
      { id: 'short-now', label: 'A profitable short trade is guaranteed' },
      { id: 'reversal', label: 'A reversal must happen at the next candle' },
    ],
    correctOptionId: 'down-structure',
    explanation: 'Lower highs and lower lows describe downward structure over the observed section. They do not predict the next candle or guarantee a profitable opportunity.',
  },
  {
    id: 'range',
    prompt: 'Price swings back and forth between broadly similar highs and lows, without a clear sequence of higher or lower swings. What is a reasonable label?',
    options: [
      { id: 'trend', label: 'A confirmed trend that cannot change' },
      { id: 'range', label: 'A possible range or sideways structure in this section' },
      { id: 'breakout', label: 'A breakout has already been confirmed' },
    ],
    correctOptionId: 'range',
    explanation: 'A range describes price oscillating within a broad area during the observed period. The range can break, and a chart label is not an entry signal.',
  },
];

export function assessTrendAnswer(questionId: string, optionId: string): { correct: boolean; explanation: string } | null {
  const question = trendQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
