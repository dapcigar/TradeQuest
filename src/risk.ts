export type RiskInput = {
  equity: number;
  riskPercent: number;
  entry: number;
  stop: number;
  unitsPerPrice: number;
};

export type RiskResult = {
  riskBudget: number;
  distance: number;
  units: number;
  estimatedLoss: number;
};

export function calculateRisk(input: RiskInput): RiskResult {
  const { equity, riskPercent, entry, stop, unitsPerPrice } = input;
  if (![equity, riskPercent, entry, stop, unitsPerPrice].every(Number.isFinite)) {
    throw new Error('Enter valid numeric values.');
  }
  if (equity <= 0 || riskPercent <= 0 || riskPercent > 100 || entry <= 0 || stop <= 0 || unitsPerPrice <= 0) {
    throw new Error('Equity, prices and contract assumptions must be positive; risk must be between 0 and 100%.');
  }
  if (entry === stop) throw new Error('Entry and stop must be different.');
  const riskBudget = equity * (riskPercent / 100);
  const distance = Math.abs(entry - stop);
  const units = riskBudget / (distance * unitsPerPrice);
  return { riskBudget, distance, units, estimatedLoss: units * distance * unitsPerPrice };
}

export type RewardRiskResult = { riskDistance: number; rewardDistance: number; ratio: number };

/** Calculate price-distance reward/risk for a fictional plan. Contract value and costs are intentionally excluded. */
export function calculateRewardRisk(input: { entry: number; stop: number; target: number }): RewardRiskResult {
  const { entry, stop, target } = input;
  if (![entry, stop, target].every(Number.isFinite)) throw new Error('Enter valid numeric prices.');
  if (entry <= 0 || stop <= 0 || target <= 0) throw new Error('Entry, stop and target must be positive.');
  if (entry === stop) throw new Error('Entry and stop must be different.');
  if (entry === target) throw new Error('Target must be beyond entry in the planned direction.');
  const isLong = stop < entry;
  if ((isLong && target <= entry) || (!isLong && target >= entry)) {
    throw new Error('Target must be beyond entry and opposite the stop direction.');
  }
  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = Math.abs(target - entry);
  return { riskDistance, rewardDistance, ratio: rewardDistance / riskDistance };
}
