export type ReplayCheckpointChoice = 'observe' | 'plan' | 'pass';

export function describeReplayCheckpoint(choice: ReplayCheckpointChoice): string {
  switch (choice) {
    case 'observe':
      return 'You chose to wait for more evidence. That can be disciplined when the visible sequence is incomplete; waiting does not imply that a move will continue.';
    case 'plan':
      return 'You chose to define evidence and invalidation before acting. A useful hypothesis states what would support it and what would make you abandon it.';
    case 'pass':
      return 'You chose not to force a decision. Passing is a valid process choice when the evidence or risk plan is unclear.';
  }
}
