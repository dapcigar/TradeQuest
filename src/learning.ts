export type KnowledgeCheckFeedback = {
  correct: boolean;
  message: string;
  nextStep: 'continue' | 'retry';
};

export function assessSpreadAnswer(choice: string | null): KnowledgeCheckFeedback | null {
  if (choice === null || choice === '') return null;
  if (choice === 'spread') {
    return {
      correct: true,
      message: 'Correct. The spread is the difference between the bid and ask prices. It is one of the costs to understand before evaluating a trade.',
      nextStep: 'continue',
    };
  }
  if (choice === 'commission') {
    return {
      correct: false,
      message: 'Not quite. A commission is a separate fee. The spread is the gap between the bid and ask prices; it can also create a cost when entering and exiting.',
      nextStep: 'retry',
    };
  }
  if (choice === 'leverage') {
    return {
      correct: false,
      message: 'Not quite. Leverage changes exposure relative to the funds required. The spread is the difference between the bid and ask prices.',
      nextStep: 'retry',
    };
  }
  return {
    correct: false,
    message: 'Choose one of the available answers to check your understanding.',
    nextStep: 'retry',
  };
}
