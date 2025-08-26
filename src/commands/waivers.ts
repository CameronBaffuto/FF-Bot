import { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env';
import { getUsers, getRosters, getAllPlayersNFL, getTrendingAdds, getStateNFL } from '../api/sleeper';
import { projectionFromPlayer } from '../services/projections';
import { computeReplacementLevel, tierFor } from '../services/waivers';
import { explainWaiver } from '../ai/explain';

function nameOf(p: any): string {
  return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unknown';
}
function injuryTag(p: any): string {
  if (p?.injury_status === 'Out') return 'Out';
  if (p?.injury_status === 'Doubtful') return 'Doubtful';
  if (p?.injury_status === 'Questionable') return 'Questionable';
  return 'OK';
}

export async function waiversCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });

  try {
    const [users, rosters, dict, trending, state] = await Promise.all([
      getUsers(env.SLEEPER_LEAGUE_ID),
      getRosters(env.SLEEPER_LEAGUE_ID),
      getAllPlayersNFL(),
      getTrendingAdds(24 * 7),
      getStateNFL(),
    ]);
    const week = state?.week ?? 1;

    // resolve me (optional)
    const uname = (process.env.SLEEPER_USERNAME || '').toLowerCase();
    const me = users.find((u: any) =>
      u.user_id === process.env.SLEEPER_USER_ID ||
      (u.username && u.username.toLowerCase() === uname) ||
      (u.display_name && u.display_name.toLowerCase() === uname)
    );

    // build taken set (league-wide)
    const taken = new Set<string>();
    for (const r of rosters) {
      for (const pid of r.players || []) taken.add(String(pid));
      for (const pid of r.starters || []) taken.add(String(pid));
      for (const pid of r.taxi || []) taken.add(String(pid));
      for (const pid of r.reserve || []) taken.add(String(pid));
    }

    // derive replacement levels from current starters (if any)
    const myRoster = me ? rosters.find((r: any) => r.owner_id === me.user_id) : null;
    const myStarters: Array<{ pos: string; mean: number }> = (myRoster?.starters || [])
      .map((pid: string) => dict[String(pid)])
      .filter(Boolean)
      .map((p: any) => {
        const base = projectionFromPlayer({ ...p, player_id: p.player_id });
        return { pos: p.position || 'WR', mean: base.mean };
      });
    const replacement = computeReplacementLevel(myStarters);

    // compute top trending and Δ vs replacement
    const topAdds = trending.reduce((m: number, t: any) => Math.max(m, Number(t?.count || 0)), 0) || 1;

    const candidates = trending
      .map((t: any) => ({
        pid: String(t.player_id),
        adds: Number(t.count || 0),
        p: dict[String(t.player_id)] || null,
      }))
      .filter(x => x.p)
      .filter(x => !taken.has(x.pid))
      .map(x => {
        const p = x.p;
        const base = projectionFromPlayer({ ...p, player_id: x.pid });
        const pos = p.position || 'WR';
        const team = p.team || 'FA';
        const delta = base.mean - (replacement[pos] ?? base.mean); // positive = upgrade over your worst starter
        const pctOfTop = x.adds / topAdds;
        return {
          pid: x.pid,
          name: nameOf(p),
          pos,
          team,
          trendAdds: x.adds,
          pctOfTop,
          trendTier: tierFor(pctOfTop),
          delta,
          risk: injuryTag(p),
        };
      })
      // prioritize delta, then trend
      .sort((a, b) => (b.delta - a.delta) || (b.pctOfTop - a.pctOfTop))
      .slice(0, 10);

    const human = candidates.map(c =>
      `• **${c.name}** (${c.pos}, ${c.team}) — Δ:${c.delta.toFixed(1)} ${c.trendTier} (${Math.round(c.pctOfTop * 100)}%) • adds:${new Intl.NumberFormat('en-US').format(c.trendAdds)}`
    );

    const needs: string[] = []; // you can compute needs from roster distribution later
    const ai = await explainWaiver({
      week,
      needs,
      candidates: candidates.slice(0, 6).map(c => ({
        name: c.name, pos: c.pos, team: c.team, delta: c.delta, trendTier: c.trendTier, risk: c.risk,
      })),
    });

    await inter.editReply([
      '**AI Waiver Suggestions**',
      ...human,
      '',
      ai ? '**Why (AI):**\n' + ai : '_Add OPENAI_API_KEY to get AI rationale._',
    ].join('\n'));
  } catch (e) {
    console.error(e);
    await inter.editReply('Error fetching waiver suggestions.');
  }
}
