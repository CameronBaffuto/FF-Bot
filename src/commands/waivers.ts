import { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env';
import { getUsers, getRosters, getAllPlayersNFL, getTrendingAdds } from '../api/sleeper';

function nameOf(p: any): string {
  return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unknown';
}
function tagInjury(p: any): string {
  if (p?.injury_status === 'Out') return '⛔ Out';
  if (p?.injury_status === 'Doubtful') return '🟠 D';
  if (p?.injury_status === 'Questionable') return '⚠️ Q';
  return '';
}
function formatInt(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}
function tierFor(pct: number): string {
  if (pct >= 0.70) return '🔥🔥🔥';
  if (pct >= 0.40) return '🔥🔥';
  if (pct >= 0.15) return '🔥';
  if (pct >= 0.05) return '↗︎';
  return '🌱';
}

interface Candidate {
  pid: string;
  name: string;
  pos: string;
  team: string;
  adds: number;
  pctOfTop: number; 
  tier: string;
  injury: string;
}

export async function waiversCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });

  try {
    const [users, rosters, allPlayers, trending] = await Promise.all([
      getUsers(env.SLEEPER_LEAGUE_ID),
      getRosters(env.SLEEPER_LEAGUE_ID),
      getAllPlayersNFL(),
      getTrendingAdds(24 * 7),
    ]);

    const uname = (process.env.SLEEPER_USERNAME || '').toLowerCase();
    const me = users.find((u: any) =>
      u.user_id === process.env.SLEEPER_USER_ID ||
      (u.username && u.username.toLowerCase() === uname) ||
      (u.display_name && u.display_name.toLowerCase() === uname)
    );

    const taken = new Set<string>();
    for (const r of rosters) {
      for (const pid of r.players || []) taken.add(String(pid));
      for (const pid of r.starters || []) taken.add(String(pid));
      for (const pid of r.taxi || []) taken.add(String(pid));
      for (const pid of r.reserve || []) taken.add(String(pid));
    }

    const topAdds = trending.reduce((m: number, t: any) => Math.max(m, Number(t?.count || 0)), 0) || 1;

    interface TrendingPlayer {
      player_id: string;
      count: number;
    }

    interface Player {
      player_id: string;
      full_name?: string;
      first_name?: string;
      last_name?: string;
      position?: string;
      team?: string;
      injury_status?: string;
    }

    interface Roster {
      players?: string[];
      starters?: string[];
      taxi?: string[];
      reserve?: string[];
    }

    const candidates: Candidate[] = (trending as TrendingPlayer[])
      .map((t: TrendingPlayer) => ({
        pid: String(t.player_id),
        adds: Number(t.count || 0),
        p: (allPlayers[String(t.player_id)] as Player) || null,
      }))
      .filter((x) => x.p) 
      .filter((x) => !taken.has(x.pid)) 
      .map((x) => {
        const p = x.p as Player;
        const pos = p.position || '?';
        const team = p.team || 'FA';
        const injury = tagInjury(p);
        const pctOfTop = x.adds / topAdds;
        return {
          pid: x.pid,
          name: nameOf(p),
          pos,
          team,
          adds: x.adds,
          pctOfTop,
          tier: tierFor(pctOfTop),
          injury,
        } as Candidate;
      })
      .sort((a, b) => b.adds - a.adds)
      .slice(0, 12);

    if (!candidates.length) {
      await inter.editReply('No trending free agents found for your league right now. Try again later.');
      return;
    }

    const lines = candidates.map((c) => {
      const pct = Math.round(c.pctOfTop * 100);
      const bits = [
        c.injury,
        `${c.tier} ${pct}% of top`,
        `adds:${formatInt(c.adds)}`
      ].filter(Boolean).join(' • ');
      return `• **${c.name}** (${c.pos}, ${c.team}) — ${bits}`;
    });

    await inter.editReply([
      '**Top Waiver/FA Targets (last 7 days)**',
      ...lines
    ].join('\n'));
  } catch (e) {
    console.error(e);
    await inter.editReply('Error fetching waiver suggestions.');
  }
}
