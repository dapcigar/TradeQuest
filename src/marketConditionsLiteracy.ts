export type MarketConditionsQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

export const marketConditionsQuestions: MarketConditionsQuestion[] = [
  {
    id: 'liquidity',
    prompt: 'A market has few active buyers and sellers, and a larger order moves the quoted price. Which concept best explains the risk?',
    options: [
      { id: 'liquidity', label: 'Lower liquidity can make execution harder and increase price impact' },
      { id: 'certainty', label: 'Low liquidity guarantees the next move will continue' },
      { id: 'direction', label: 'Liquidity tells you whether price will rise or fall' },
    ],
    correctOptionId: 'liquidity',
    explanation: 'Liquidity describes how readily trades can occur without a large price impact. It can vary by instrument, venue, size, and time; it does not predict direction.',
  },
  {
    id: 'volatility',
    prompt: 'Two fictional sessions both move 20 points, but one makes the move in seconds and the other over several hours. What is the useful distinction?',
    options: [
      { id: 'same-risk', label: 'The point move is identical, so timing and uncertainty do not matter' },
      { id: 'volatility', label: 'The speed and variability of movement affect uncertainty and execution risk' },
      { id: 'guaranteed', label: 'Faster movement guarantees a better opportunity' },
    ],
    correctOptionId: 'volatility',
    explanation: 'Volatility describes the degree and speed of price variation over a period. A simple point change is not enough to describe path, spread, slippage, or risk.',
  },
  {
    id: 'sessions',
    prompt: 'A learner notices that an instrument is often more active during a particular market session. What is the most responsible conclusion?',
    options: [
      { id: 'guarantee', label: 'Trade only then because the pattern guarantees a successful outcome' },
      { id: 'schedule', label: 'Treat session patterns as context, then verify the instrument, venue, holidays, and current conditions' },
      { id: 'universal', label: 'Every instrument has the same opening hours and liquidity pattern' },
    ],
    correctOptionId: 'schedule',
    explanation: 'Activity patterns vary across instruments, venues, time zones, holidays, and market regimes. A session label is context—not a signal or guarantee.',
  },
];

export function assessMarketConditionsAnswer(questionId: string, optionId: string) {
  const question = marketConditionsQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
