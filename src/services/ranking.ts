/** Risk-aware ranking utilities (EV − λσ) + P(A>B) */

export function scoreEvMinusLambdaSigma(mean: number, stdev: number, lambda = 0.6) {
  return mean - lambda * stdev;
}

/** Probability A > B for independent Normals */
export function probAGreaterB(aMean: number, aStd: number, bMean: number, bStd: number) {
  const mu = aMean - bMean;
  const sigma = Math.sqrt(aStd * aStd + bStd * bStd) || 1e-6;
  const z = mu / sigma;
  // Φ(z) using erf
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

// fast erf approximation
function erf(x: number): number {
  // Abramowitz and Stegun formula 7.1.26
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export type Candidate = {
  pid: string;
  name: string;
  pos: string;
  team: string;
  opp: string;
  mean: number;
  stdev: number;
  isTNF: boolean;
  tags: string[];
};

/** Simple slot fill: QB, RB, RB, WR, WR, TE, FLEX */
export function fillLineup(cands: Candidate[], slots: string[], lambda = 0.6) {
  const remaining = [...cands];
  const starters: Candidate[] = [];
  const bench: Candidate[] = [];

  const canPlayFlex = (pos: string) => ['RB', 'WR', 'TE'].includes(pos);

  for (const slot of slots) {
    // choose eligible candidates
    const elig = remaining.filter(c =>
      slot === 'FLEX' ? canPlayFlex(c.pos) : c.pos === slot
    );
    if (!elig.length) continue;
    // choose best by EV − λσ
    elig.sort((a, b) => (scoreEvMinusLambdaSigma(b.mean, b.stdev, lambda) -
                         scoreEvMinusLambdaSigma(a.mean, a.stdev, lambda)));
    const best = elig[0];
    starters.push(best);
    // remove from remaining
    const idx = remaining.findIndex(x => x.pid === best.pid);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  // everyone not selected is bench
  for (const c of remaining) bench.push(c);

  return { starters, bench };
}
