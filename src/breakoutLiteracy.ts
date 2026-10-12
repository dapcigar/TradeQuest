export type BreakoutOption = { id: string; label: string };
export type BreakoutQuestion = {
  id: string;
  prompt: string;
  options: BreakoutOption[];
  correctOptionId: string;
  explanation: string;
};

export const breakoutQuestions: BreakoutQuestion[] = [
  {
    id: 'close',
    prompt: 'Price briefly moves above a drawn range, but the candle closes back inside it. What is the most careful description?',
    options: [
      { id: 'confirmed', label: 'A confirmed breakout that must continue higher' },
      { id: 'rejected', label: 'A possible failed attempt to break out; more context is needed' },
      { id: 'buy', label: 'An automatic buy signal' },
    ],
    correctOptionId: 'rejected',
    explanation: 'A move beyond a boundary that returns inside may be described as a failed breakout attempt in this example. One candle alone does not establish what happens next.',
  },
  {
    id: 'wait',
    prompt: 'A synthetic candle closes above a range boundary. What can you conclude from that fact alone?',
    options: [
      { id: 'guarantee', label: 'The move is guaranteed to continue' },
      { id: 'nothing', label: 'Nothing about the close matters in any context' },
      { id: 'limited', label: 'The close is one observation; continuation remains uncertain and context matters' },
    ],
    correctOptionId: 'limited',
    explanation: 'A close beyond a boundary is an observation, not proof of continuation. Definitions of confirmation vary, and later price action can reverse.',
  },
  {
    id: 'plan',
    prompt: 'You think a breakout may be developing, but you have no invalidation point or defined loss limit. What is the risk-first response?',
    options: [
      { id: 'chase', label: 'Enter immediately so you do not miss it' },
      { id: 'plan', label: 'Wait, define what would invalidate the idea and assess risk, or pass' },
      { id: 'double', label: 'Use a larger position to make the move worthwhile' },
    ],
    correctOptionId: 'plan',
    explanation: 'A chart pattern is not a complete plan. If the idea cannot be evaluated with a clear invalidation point and acceptable risk, waiting or passing is a valid decision.',
  },
];

export function assessBreakoutAnswer(questionId: string, optionId: string): { correct: boolean; explanation: string } | null {
  const question = breakoutQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
