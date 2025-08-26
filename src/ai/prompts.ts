export const SYSTEM_COACH = `You are an elite fantasy football co-manager.
Be decisive. Use concise bullet points. Avoid hedging. Prefer practical guidance.`;

/** Lineup explainer prompt */
export function lineupUserPrompt(payload: {
  week: number;
  scoring: string;
  slots: string[];
  candidates: Array<{ name: string; pos: string; team: string; opp: string; mean: number; stdev: number; tags: string[] }>;
  notes: string[];
}) {
  const header = `Week ${payload.week} ${payload.scoring} lineup. Slots: ${payload.slots.join(', ')}`;
  const rows = payload.candidates.map(p =>
    `- ${p.name} (${p.pos}, ${p.team}${p.opp ? ' vs ' + p.opp : ''}) mean:${p.mean.toFixed(1)} sd:${p.stdev.toFixed(1)} tags:${p.tags.join('|')}`
  ).join('\n');
  const warns = payload.notes.length ? `Notes:\n${payload.notes.map(n => `- ${n}`).join('\n')}` : '';
  return `${header}\n${warns}\nCandidates:\n${rows}\n\nRules:
1) If two options are within ~1.5 pts EV, use injury/TNF risk to break ties (safer if we lead; upside if we trail).
2) Output 4–6 bullets: Name → Slot with a 1-line reason each, then a crisp TL;DR.`;
}

/** Compare prompt */
export function compareUserPrompt(payload: {
  week: number;
  A: { name: string; mean: number; stdev: number; tags: string[]; opp: string };
  B: { name: string; mean: number; stdev: number; tags: string[]; opp: string };
  pAGreaterB: number; // 0..1
}) {
  return `Week ${payload.week} compare.
A ${payload.A.name} vs B ${payload.B.name}.
EVs A:${payload.A.mean.toFixed(1)}±${payload.A.stdev.toFixed(1)} vs B:${payload.B.mean.toFixed(1)}±${payload.B.stdev.toFixed(1)}.
P(A>B)=${Math.round(payload.pAGreaterB * 100)}%.
Tags A:${payload.A.tags.join('|')} vs B:${payload.B.tags.join('|')}.
Opponent: A vs ${payload.A.opp || 'TBD'}, B vs ${payload.B.opp || 'TBD'}.
Give 2 bullets: who to start and why, then a 1-line TL;DR.`;
}

/** Waivers prompt */
export function waiverUserPrompt(payload: {
  week: number;
  needs: string[];
  candidates: Array<{ name: string; pos: string; team: string; delta: number; trendTier: string; risk: string }>;
}) {
  const list = payload.candidates.slice(0, 8).map(c =>
    `- ${c.name} (${c.pos}, ${c.team}) ΔvsReplacement:${c.delta.toFixed(1)} ${c.trendTier} ${c.risk}`
  ).join('\n');
  return `Week ${payload.week} waiver short list.
Team needs: ${payload.needs.join(', ') || 'balanced'}
Use Δ vs replacement first, trend as tiebreaker. Prefer early role changes.
Write 3–5 bullets: top 2 adds (why), 1–2 conditional adds, and who to drop if needed.\n${list}`;
}

/** Trade prompt */
export function tradeUserPrompt(payload: {
  goals: string[];
  myNeeds: string[];
  offers: Array<{ target: string; give: string[]; ask: string[]; rationale: string }>;
}) {
  const lines = payload.offers.map(o =>
    `- Target ${o.target}: Give ${o.give.join(' + ')} / Ask ${o.ask.join(' + ')} — ${o.rationale}`
  ).join('\n');
  return `Trade ideas. Goals: ${payload.goals.join(', ')}. My needs: ${payload.myNeeds.join(', ')}.
Suggest 1–2 realistic packages with short rationale each. Avoid lopsided asks.\n${lines}`;
}
