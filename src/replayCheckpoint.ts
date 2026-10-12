export type ReplayCheckpointChoice = 'observe' | 'plan' | 'pass';
export type ReplayCheckpointRecord = { choice: ReplayCheckpointChoice; note: string; revealedIndex: number };

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

export function summariseReplayCheckpoints(records: ReplayCheckpointRecord[]) {
  const counts = { observe: 0, plan: 0, pass: 0 };
  for (const record of records) counts[record.choice] += 1;
  let reflection = 'No checkpoint choices were recorded. Try another replay and pause to consider the evidence before each reveal.';
  if (records.length > 0) {
    const distinctChoices = Object.values(counts).filter(count => count > 0).length;
    reflection = distinctChoices > 1
      ? 'You used more than one process response. Review your notes: what evidence made you change approach, and what would you want to define more clearly next time?'
      : counts.observe > 0
        ? 'You consistently chose to observe. Reflect on what specific evidence would be enough to form or reject a hypothesis; waiting is useful when it has a clear purpose.'
        : counts.plan > 0
          ? 'You consistently chose to plan. Check whether each plan named both supporting evidence and a clear invalidation condition.'
          : 'You consistently chose to pass. Reflect on what information or risk definition would be needed before you would consider a decision.';
  }
  return { total: records.length, counts, reflection };
}
