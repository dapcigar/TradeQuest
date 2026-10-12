export type ExecutionQuestion = { id: string; prompt: string; options: Array<{ id: string; label: string }>; correctOptionId: string; explanation: string };

export const executionQuestions: ExecutionQuestion[] = [
  {
    id: 'market-order',
    prompt: 'In a fictional market, a market order is submitted while prices are moving quickly. Which statement is most accurate?',
    options: [
      { id: 'exact-price', label: 'It guarantees execution at the price last shown on screen' },
      { id: 'execution-priority', label: 'It prioritises execution, but the fill price can differ from the displayed quote' },
      { id: 'no-fill', label: 'It can only execute if the price stays unchanged' },
    ],
    correctOptionId: 'execution-priority',
    explanation: 'A market order prioritises execution rather than a specific price. In a fast or thin market, the fill can differ from the displayed quote; execution is not guaranteed at the last-seen price.',
  },
  {
    id: 'limit-order',
    prompt: 'A hypothetical buy limit is set below the current ask. What is the important trade-off?',
    options: [
      { id: 'guaranteed-fill', label: 'It guarantees a fill at the limit or better' },
      { id: 'guaranteed-profit', label: 'It guarantees a profit if the market reaches that price' },
      { id: 'price-control', label: 'It sets a maximum acceptable buy price, but may not fill' },
    ],
    correctOptionId: 'price-control',
    explanation: 'A buy limit controls the maximum acceptable price, but the market may never reach it or available liquidity may be insufficient. A limit order does not guarantee execution or profit.',
  },
  {
    id: 'slippage',
    prompt: 'A stop order triggers during a sharp price gap and the next available price is worse than expected. What is this an example of?',
    options: [
      { id: 'slippage', label: 'Slippage: execution differs from the expected trigger or quote price' },
      { id: 'spread-only', label: 'Spread only; execution price cannot differ from a stop price' },
      { id: 'guaranteed-stop', label: 'A guaranteed fill at the exact stop price' },
    ],
    correctOptionId: 'slippage',
    explanation: 'A stop trigger is not necessarily a guaranteed execution price. Gaps, volatility, liquidity, venue rules, and order type can affect the fill; product-specific terms matter.',
  },
];

export function assessExecutionAnswer(questionId: string, optionId: string) {
  const question = executionQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
