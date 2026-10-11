export type EvidenceBucket = {
  attempts: number;
  positiveDecisions: number;
  successRate: number | null;
  confidence: string;
};

export type ApplicationBucket = EvidenceBucket & { transferAttempts: number; transferPositiveDecisions: number };

export function confidenceLabel(confidence: string): string {
  if (confidence === 'building') return 'building signal';
  if (confidence === 'early-signal') return 'early signal';
  return 'too few to judge';
}

// A percentage is shown only once there is enough evidence to mean something; before that
// the raw count is shown, because "100% positive" from one attempt overstates what is known.
export function describeEvidence(bucket: EvidenceBucket): string {
  if (bucket.attempts === 0) return 'None yet';
  const counts = `${bucket.positiveDecisions} of ${bucket.attempts} positive`;
  if (bucket.confidence === 'not-enough-evidence' || bucket.successRate === null) return `${counts} · too few to judge`;
  return `${bucket.successRate}% positive (${counts}) · ${confidenceLabel(bucket.confidence)}`;
}

export function describeTransfer(bucket: ApplicationBucket): string {
  if (bucket.transferAttempts === 0) return 'No transfer evidence yet';
  return `${bucket.transferPositiveDecisions} of ${bucket.transferAttempts} positive on new scenarios after your first`;
}
