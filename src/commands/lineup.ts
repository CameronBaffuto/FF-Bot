import { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env';
import { getUsers, getRosters, getAllPlayersNFL, getStateNFL } from '../api/sleeper';
import { getWeekScoreboard, buildKickoffMap } from '../api/espn';
import { projectionFromPlayer } from '../services/projections';
import { adjustStats } from '../services/injury';
import { fillLineup } from '../services/ranking';
import { explainLineup } from '../ai/explain';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockRoster = require('../mock/roster.json');

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
function fmtKickoff(iso?: string, tz: string = env.TZ): string {
  if (!iso) return 'TBD';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch { return 'TBD'; }
}

export async function lineupCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });

  try {
    const state = await getStateNFL();
    const week = state?.week ?? 1;

    const [users, rosters, dict, sb] = await Promise.all([
      getUsers(env.SLEEPER_LEAGUE_ID),
      getRosters(env.SLEEPER_LEAGUE_ID),
      getAllPlayersNFL(),
      getWeekScoreboard(week),
    ]);
    const kickoffMap = buildKickoffMap(sb);

    // resolve user
    const uname = (process.env.SLEEPER_USERNAME || '').toLowerCase();
    const me = users.find((u: any) =>
      u.user_id === process.env.SLEEPER_USER_ID ||
      (u.username && u.username.toLowerCase() === uname) ||
      (u.display_name && u.display_name.toLowerCase() === uname)
    );

    // roster with mock fallback
    let roster: any = me ? rosters.find((r: any) => r.owner_id === me.user_id) : null;
    if (!roster || !roster.players?.length) {
      roster = mockRoster;
    }
    const allIds: string[] = roster.players || [];
    const slots = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX'];

    // build candidate list
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

    // pick starters
    const { starters, bench } = fillLineup(candidates, slots, 0.6);

    const riskNotes: string[] = [];
    const hasTNFQ = starters.some(x => x.isTNF && x.tags.includes('Q'));
    if (hasTNFQ) riskNotes.push('⚠️ Q starter on TNF — consider safer option unless upgraded by Thu afternoon.');
    const hasOut = starters.some(x => x.tags.includes('Out'));
    if (hasOut) riskNotes.push('⛔ A listed starter is Out.');

    // AI explanation (optional if no key)
    const explanation = await explainLineup({
      week,
      scoring: 'PPR',
      slots,
      candidates: starters.map(s => ({
        name: s.name, pos: s.pos, team: s.team, opp: s.opp, mean: s.mean, stdev: s.stdev, tags: s.tags,
      })),
      notes: riskNotes,
    });

    const fmt = (x: typeof starters[number]) =>
      `• ${x.name} (${x.pos}, ${x.team} vs ${x.opp}) — ${x.mean.toFixed(1)}±${x.stdev.toFixed(1)} ${x.isTNF ? '🟣 TNF ' : ''}${fmtKickoff(kickoffMap[x.team]?.kickoff_utc)}`;

    await inter.editReply([
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
    ].join('\n'));
  } catch (e) {
    console.error(e);
    await inter.editReply('Error building AI lineup.');
  }
}
