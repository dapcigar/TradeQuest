export type PsychologyQuestion = { id: string; prompt: string; options: Array<{ id: string; label: string }>; correctOptionId: string; explanation: string };

export const psychologyQuestions: PsychologyQuestion[] = [
  {
    id: 'outcome-bias',
    prompt: 'You followed a documented risk plan, but a synthetic scenario still ended in a loss. How should you review the decision?',
    options: [
      { id: 'bad-decision', label: 'It lost, so the decision must have been wrong' },
      { id: 'review-process', label: 'Assess the evidence and whether the plan was followed; outcome alone is not enough' },
      { id: 'repeat-bigger', label: 'Repeat the same idea with a larger size to recover' },
    ],
    correctOptionId: 'review-process',
    explanation: 'Outcome bias judges a decision only by what happened. Review the information and process available at the time, while accepting that sound decisions can still lose.',
  },
  {
    id: 'fomo',
    prompt: 'A chart makes a sharp move and you worry you will miss the opportunity. Your entry, invalidation, and risk are not defined. What is the disciplined response?',
    options: [
      { id: 'chase', label: 'Enter immediately before the move gets away' },
      { id: 'invent-plan', label: 'Choose a stop after entering so you can participate' },
      { id: 'wait-or-pass', label: 'Wait for a complete plan or pass on the scenario' },
    ],
    correctOptionId: 'wait-or-pass',
    explanation: 'Fear of missing out is not evidence. Missing an uncertain opportunity is preferable to inventing a risk plan under pressure.',
  },
  {
    id: 'confirmation-bias',
    prompt: 'You favour a hypothetical idea and only notice evidence that supports it. What can help counter confirmation bias?',
    options: [
      { id: 'seek-disconfirming', label: 'Write down what would invalidate the idea and look for contrary evidence' },
      { id: 'ignore-opposition', label: 'Ignore information that conflicts with your view' },
      { id: 'ask-for-certainty', label: 'Wait until someone guarantees the outcome' },
    ],
    correctOptionId: 'seek-disconfirming',
    explanation: 'Actively checking disconfirming evidence makes the thesis testable. It cannot remove uncertainty or guarantee a better result.',
  },
];

export function assessPsychologyAnswer(questionId: string, optionId: string) {
  const question = psychologyQuestions.find(item => item.id === questionId);
  if (!question || !question.options.some(option => option.id === optionId)) return null;
  return { correct: question.correctOptionId === optionId, explanation: question.explanation };
}
