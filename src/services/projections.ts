/**
 * Minimal projection provider.
 * Uses a small default by position if no feed present.
 * You can swap this to any JSON/CSV source later.
 */
type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF' | string;

const DEFAULT_MEAN: Record<Pos, number> = {
  QB: 18, RB: 11, WR: 11, TE: 8, K: 7, DEF: 7,
};
const DEFAULT_STDEV: Record<Pos, number> = {
  QB: 5, RB: 4, WR: 5, TE: 3.5, K: 3, DEF: 3,
};

export type PlayerProjection = {
  player_id: string;
  mean: number;
  stdev: number;
};

export function projectFor(pos: Pos): { mean: number; stdev: number } {
  return {
    mean: DEFAULT_MEAN[pos] ?? 8,
    stdev: DEFAULT_STDEV[pos] ?? 4,
  };
}

export function projectionFromPlayer(p: any): PlayerProjection {
  const pos: Pos = p?.position || 'WR';
  const { mean, stdev } = projectFor(pos);
  return { player_id: String(p?.player_id ?? ''), mean, stdev };
}
