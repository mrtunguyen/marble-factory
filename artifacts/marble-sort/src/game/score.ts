export interface RunResult {
  timeSec: number;
  taps: number;
}

export interface ScoreBreakdown {
  score: number;
  stars: 1 | 2 | 3;
  timeBonus: number;
  tapBonus: number;
}

export function computeScore(
  run: RunResult,
  par: { time: number; taps: number },
): ScoreBreakdown {
  const timeBonus = Math.max(0, Math.round((par.time - run.timeSec) * 10));
  const tapBonus = Math.max(0, (par.taps - run.taps) * 25);
  const score = 1000 + timeBonus + tapBonus;
  const stars: 1 | 2 | 3 = score >= 1400 ? 3 : score >= 1150 ? 2 : 1;
  return { score, stars, timeBonus, tapBonus };
}
