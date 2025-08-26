import { getAllPlayersNFL, getRosters, getStateNFL, getUsers, getTrendingAdds } from '../api/sleeper';
import { getWeekScoreboard, buildKickoffMap } from '../api/espn';
import { projectionFromPlayer } from '../services/projections';
import { adjustStats } from '../services/injury';
import { fillLineup } from '../services/ranking';
import { explainLineup, explainWaiver } from '../ai/explain';

// ---- helpers (no dotenv in Lambda; read env directly) ----
const TZ = process.env.TZ || 'America/New_York';

function nameOf(p: any) {
  return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unknown';
}
function injuryStatus(p: any): 'OK' | 'Questionable' | 'Doubtful' | 'Out' {
  const s = (p?.injury_status || 'OK') as any;
  return ['Questionable', 'Doubtful', 'Out'].includes(s) ? s : 'OK';
}
function tagsFor(p: any, isTNF: boolean): string[] {
  const t: string[] = [];
  if (isTNF) t.push('TNF');
  if (p?.injury_status === 'Questionable') t.push('Q');
  if (p?.injury_status === 'Doubtful') t.push('D');
  if (p?.injury_status === 'Out') t.push('Out');
  return t;
}
function fmtKickoff(iso?: string): string {
  if (!iso) return 'TBD';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch { return 'TBD'; }
}
async function postToDiscord(content: string) {
  const token = process.env.DISCORD_TOKEN!;
  const channelId = process.env.DISCORD_CHANNEL_ID!;
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

// ---- main tasks ----
async function runLineup(): Promise<string> {
  const leagueId = process.env.SLEEPER_LEAGUE_ID!;
  const username = (process.env.SLEEPER_USERNAME || '').toLowerCase();
  const userId = process.env.SLEEPER_USER_ID;

  const state = await getStateNFL();
  const week = state?.week ?? 1;
  const [users, rosters, dict, sb] = await Promise.all([
    getUsers(leagueId),
    getRosters(leagueId),
    getAllPlayersNFL(),
    getWeekScoreboard(week),
  ]);
  const kickoffMap = buildKickoffMap(sb);

  let me = users.find((u: any) => u.user_id === userId);
  if (!me && username) {
    me = users.find((u: any) =>
      (u.username && u.username.toLowerCase() === username) ||
      (u.display_name && u.display_name.toLowerCase() === username)
    );
  }

  let roster = me ? rosters.find((r: any) => r.owner_id === me.user_id) : null;
  if (!roster || !roster.players?.length) {
    // optional pre-draft fallback
    try { roster = JSON.parse(process.env.MOCK_ROSTER_JSON || '{}'); } catch {}
  }
  const allIds: string[] = roster?.players || [];
  const slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'];

  const candidates = allIds.map(pid => {
    const p = dict[String(pid)] || {};
    const pos = p.position || '?';
    const team = p.team || 'FA';
    const opp = kickoffMap[team]?.opp || 'TBD';
    const isTNF = !!kickoffMap[team]?.is_tnf;

    const base = projectionFromPlayer({ ...p, player_id: pid });
    const adj = adjustStats(base.mean, base.stdev, injuryStatus(p), isTNF);

    return {
      pid: String(pid),
      name: nameOf(p),
      pos,
      team,
      opp,
      mean: adj.mean,
      stdev: adj.stdev,
      isTNF,
      tags: tagsFor(p, isTNF),
    };
  });

  const { starters, bench } = fillLineup(candidates, slots, 0.6);

  const riskNotes: string[] = [];
  const hasTNFQ = starters.some(x => x.isTNF && x.tags.includes('Q'));
  if (hasTNFQ) riskNotes.push('⚠️ Q starter on TNF — consider safer option unless upgraded by Thu afternoon.');
  const hasOut = starters.some(x => x.tags.includes('Out'));
  if (hasOut) riskNotes.push('⛔ A listed starter is Out.');

  const explanation = await explainLineup({
    week, scoring: 'PPR', slots,
    candidates: starters.map(s => ({
      name: s.name, pos: s.pos, team: s.team, opp: s.opp, mean: s.mean, stdev: s.stdev, tags: s.tags,
    })),
    notes: riskNotes,
  });

  const fmt = (x: typeof starters[number]) =>
    `• ${x.name} (${x.pos}, ${x.team} vs ${x.opp}) — ${x.mean.toFixed(1)}±${x.stdev.toFixed(1)} ${x.isTNF ? '🟣 TNF ' : ''}${fmtKickoff(kickoffMap[x.team]?.kickoff_utc)}`;

  return [
    `**AI Lineup — Week ${week}**`,
    '',
    '**Starters:**',
    ...(starters.length ? starters.map(fmt) : ['(none)']),
    '',
    '**Bench:**',
    ...(bench.length ? bench.map(fmt) : ['(none)']),
    '',
    ...(riskNotes.length ? riskNotes : []),
    explanation ? ['', '**Why (AI):**', explanation].join('\n') : '_Add OPENAI_API_KEY to get AI rationale._',
  ].join('\n');
}

async function runWaivers(): Promise<string> {
  const leagueId = process.env.SLEEPER_LEAGUE_ID!;
  const username = (process.env.SLEEPER_USERNAME || '').toLowerCase();
  const userId = process.env.SLEEPER_USER_ID;

  const [users, rosters, dict, trending, state] = await Promise.all([
    getUsers(leagueId),
    getRosters(leagueId),
    getAllPlayersNFL(),
    getTrendingAdds(24 * 7),
    getStateNFL(),
  ]);
  const week = state?.week ?? 1;

  let me = users.find((u: any) => u.user_id === userId);
  if (!me && username) {
    me = users.find((u: any) =>
      (u.username && u.username.toLowerCase() === username) ||
      (u.display_name && u.display_name.toLowerCase() === username)
    );
  }

  // league "taken" set
  const taken = new Set<string>();
  for (const r of rosters) {
    for (const pid of r.players || []) taken.add(String(pid));
    for (const pid of r.starters || []) taken.add(String(pid));
    for (const pid of r.taxi || []) taken.add(String(pid));
    for (const pid of r.reserve || []) taken.add(String(pid));
  }

  // very simple replacement using your starters (or defaults via projections)
  const myRoster = me ? rosters.find((r: any) => r.owner_id === me.user_id) : null;
  const replacement: Record<string, number> = {};
  for (const pid of myRoster?.starters || []) {
    const p = dict[String(pid)];
    if (!p) continue;
    const pos = p.position || 'WR';
    const { mean } = projectionFromPlayer({ ...p, player_id: pid });
    replacement[pos] = replacement[pos] == null ? mean : Math.min(replacement[pos], mean);
  }
  for (const pos of ['QB', 'RB', 'WR', 'TE']) {
    if (replacement[pos] == null) {
      const { mean } = projectionFromPlayer({ position: pos, player_id: '' } as any);
      replacement[pos] = mean;
    }
  }

  const topAdds = trending.reduce((m: number, t: any) => Math.max(m, Number(t?.count || 0)), 1);

  const candidates = trending
    .map((t: any) => ({ pid: String(t.player_id), adds: Number(t.count || 0), p: dict[String(t.player_id)] || null }))
    .filter(x => x.p && !taken.has(x.pid))
    .map(x => {
      const p = x.p;
      const pos = p.position || 'WR';
      const team = p.team || 'FA';
      const { mean } = projectionFromPlayer({ ...p, player_id: x.pid });
      const delta = mean - (replacement[pos] ?? mean);
      const pctOfTop = x.adds / topAdds;
      return {
        name: nameOf(p),
        pos, team,
        delta,
        trendTier: pctOfTop >= 0.7 ? '🔥🔥🔥' : pctOfTop >= 0.4 ? '🔥🔥' : pctOfTop >= 0.15 ? '🔥' : pctOfTop >= 0.05 ? '↗︎' : '🌱',
        risk: p?.injury_status || 'OK',
        trendAdds: x.adds,
        pctOfTop,
      };
    })
    .sort((a, b) => (b.delta - a.delta) || (b.pctOfTop - a.pctOfTop))
    .slice(0, 10);

  const human = candidates.map(c =>
    `• **${c.name}** (${c.pos}, ${c.team}) — Δ:${c.delta.toFixed(1)} ${c.trendTier} (${Math.round(c.pctOfTop * 100)}%) • adds:${new Intl.NumberFormat('en-US').format(c.trendAdds)}`
  );

  const ai = await explainWaiver({
    week,
    needs: [],
    candidates: candidates.slice(0, 6).map(c => ({
      name: c.name, pos: c.pos, team: c.team, delta: c.delta, trendTier: c.trendTier, risk: c.risk,
    })),
  });

  return [
    '**AI Waiver Suggestions**',
    ...human,
    '',
    ai ? '**Why (AI):**\n' + ai : '_Add OPENAI_API_KEY to get AI rationale._',
  ].join('\n');
}

// ---- Lambda handler ----
export const handler = async (event: any = {}) => {
  try {
    const task = event?.task || 'final_check'; // default
    let content: string;

    if (task === 'tnf_check' || task === 'final_check') {
      content = await runLineup();
    } else if (task === 'waivers') {
      content = await runWaivers();
    } else {
      content = `Unknown task: ${task}`;
    }

    const res = await postToDiscord(content);
    return { statusCode: res.status, body: res.text };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: String(err?.message || err) };
  }
};
