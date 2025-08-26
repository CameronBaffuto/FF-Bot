export type InjuryStatus = 'OK' | 'Questionable' | 'Doubtful' | 'Out';

export function adjustStats(mean: number, stdev: number, status: InjuryStatus, isTNF: boolean) {
  let m = mean;
  let s = stdev;

  if (status === 'Out') {
    m = 0;
    s = Math.max(s, 4);
  } else if (status === 'Doubtful') {
    m *= 0.6;
    s *= 1.3;
  } else if (status === 'Questionable') {
    m *= 0.85;
    s *= 1.15;
  }

  if (isTNF) {
    if (status === 'Doubtful') m *= 0.85;
    if (status === 'Questionable') m *= 0.9;
  }

  return { mean: m, stdev: s };
}
