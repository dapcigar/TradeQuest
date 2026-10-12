export type CandleQuestion = { id: string; prompt: string; options: Array<{ id: string; label: string }>; correctOptionId: string; explanation: string };

export const candleQuestions: CandleQuestion[] = [
  { id: 'body', prompt: 'What does the candle body show?', options: [{ id: 'range', label: 'The full high-to-low range' }, { id: 'open-close', label: 'The relationship between opening and closing prices' }, { id: 'volume', label: 'How many trades took place' }], correctOptionId: 'open-close', explanation: 'The body spans the open and close. The wick shows the extremes reached during the period.' },
  { id: 'wick', prompt: 'A candle has a long upper wick. What can you safely conclude?', options: [{ id: 'reversal', label: 'Price must fall next' }, { id: 'buyers', label: 'Buyers have guaranteed control' }, { id: 'high-rejected', label: 'Price reached a higher level but closed below that high' }], correctOptionId: 'high-rejected', explanation: 'The upper wick marks the high above the close. It may suggest rejection, but one candle cannot guarantee what happens next.' },
  { id: 'direction', prompt: 'If a candle closes above its open, what does that candle indicate?', options: [{ id: 'bullish', label: 'A bullish candle for that period' }, { id: 'trend', label: 'The market is now in a confirmed uptrend' }, { id: 'profit', label: 'A profitable trade was available' }], correctOptionId: 'bullish', explanation: 'It is bullish for that period only. A single candle does not confirm a trend or prove that a trade was available.' },
];

export type CandleAnswerResult = { correct: boolean; explanation: string };
export function assessCandleAnswer(questionId: string, optionId: string): CandleAnswerResult | null {
  const question = candleQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
