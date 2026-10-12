export type BacktestingQuestion = {
  id: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

export const backtestingQuestions: BacktestingQuestion[] = [
  {
    id: 'small-sample',
    prompt: 'A fictional strategy made money in four test examples. What can you responsibly conclude?',
    options: [
      { id: 'proven', label: 'The strategy is proven and should work in future markets' },
      { id: 'limited', label: 'The result is a small sample; it is not enough to establish a reliable edge' },
      { id: 'increase-risk', label: 'Increase risk because the first results were positive' },
    ],
    correctOptionId: 'limited',
    explanation: 'A few examples provide weak evidence. Results can occur by chance, and more observations still need careful design and interpretation.',
  },
  {
    id: 'overfitting',
    prompt: 'A learner repeatedly changes rules until one set matches the past data very closely. What is the main concern?',
    options: [
      { id: 'overfitting', label: 'Overfitting: the rules may capture noise that does not repeat' },
      { id: 'certainty', label: 'The closer the historical fit, the more certain future results become' },
      { id: 'no-risk', label: 'A good historical fit removes execution costs and uncertainty' },
    ],
    correctOptionId: 'overfitting',
    explanation: 'Repeatedly tuning rules to the same data can fit random noise. A good in-sample fit is not proof that the idea generalises to unseen data.',
  },
  {
    id: 'test-design',
    prompt: 'A historical test ignores spread, fees, slippage and uses the same period to invent and evaluate its rules. What is the best next step?',
    options: [
      { id: 'publish', label: 'Treat the reported result as the expected real-world outcome' },
      { id: 'optimise', label: 'Keep adjusting rules on the same period until the result improves' },
      { id: 'robust', label: 'Document assumptions and costs, separate development from out-of-sample testing, and test robustness' },
    ],
    correctOptionId: 'robust',
    explanation: 'A more credible evaluation discloses costs and assumptions, avoids data leakage, separates development from out-of-sample evaluation, and checks whether conclusions are robust. It still cannot guarantee future results.',
  },
];

export function assessBacktestingAnswer(questionId: string, optionId: string) {
  const question = backtestingQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: optionId === question.correctOptionId, explanation: question.explanation };
}
