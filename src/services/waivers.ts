import { projectFor } from './projections';

export type WaiverCandidate = {
  pid: string;
  name: string;
  pos: string;
  team: string;
  trendAdds: number;
  pctOfTop: number;
  trendTier: string;
  delta: number;
  risk: string; 
};

export function tierFor(pct: number): string {
  if (pct >= 0.70) return '🔥🔥🔥';
  if (pct >= 0.40) return '🔥🔥';
  if (pct >= 0.15) return '🔥';
  if (pct >= 0.05) return '↗︎';
  return '🌱';
}

/** Compute replacement level from current starters by position (fallback to defaults) */
export function computeReplacementLevel(starters: Array<{ pos: string; mean: number }>) {
  const grouped: Record<string, number[]> = {};
  for (const s of starters) {
    grouped[s.pos] = grouped[s.pos] || [];
    grouped[s.pos].push(s.mean);
  }
  const rep: Record<string, number> = {};
  for (const [pos, arr] of Object.entries(grouped)) {
    rep[pos] = Math.min(...arr); // worst starter at that position
  }
  // Ensure defaults exist
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    if (rep[pos] == null) rep[pos] = projectFor(pos as any).mean;
  }
  return rep;
}
