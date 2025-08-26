// src/commands/startsit.ts
import { ChatInputCommandInteraction } from 'discord.js';
import { getUsers, getRosters, getAllPlayersNFL, getStateNFL } from '../api/sleeper';
import { getWeekScoreboard, buildKickoffMap } from '../api/espn';
import { env } from '../config/env';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mockRoster = require('../mock/roster.json');

// --- helpers ---
function nameOf(p: any): string {
  return p?.full_name || [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unknown';
}
function tagsFor(p: any, tnf = false): string {
  const t: string[] = [];
  if (tnf) t.push('🟣 TNF');
  if (p?.injury_status === 'Questionable') t.push('⚠️ Q');
  if (p?.injury_status === 'Doubtful')     t.push('🟠 D');
  if (p?.injury_status === 'Out')          t.push('⛔ Out');
  return t.join(' ');
}
function fmtKickoff(iso?: string, tz: string = env.TZ): string {
  if (!iso) return 'TBD';
  try {
    // keep it simple to avoid extra deps: show local ISO without luxon
    const d = new Date(iso);
    return d.toLocaleString('en-US', { timeZone: tz, weekday: 'short', hour: 'numeric', minute: '2-digit' });
  } catch { return 'TBD'; }
}

// --- command ---
export async function startSitCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });

  try {
    const state = await getStateNFL();
    const week = state?.week ?? 1;

    const [users, rosters, allPlayers, sb] = await Promise.all([
      getUsers(env.SLEEPER_LEAGUE_ID),
      getRosters(env.SLEEPER_LEAGUE_ID),
      getAllPlayersNFL(),
      getWeekScoreboard(week),
    ]);
    const kickoffMap = buildKickoffMap(sb);

    // resolve myself
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

    const starters: string[] = roster.starters || [];
    const bench: string[] = roster.players?.filter((id: string) => !starters.includes(id)) || [];

    const fmt = (pid: string) => {
      const p = allPlayers[String(pid)] || {};
      const team = p?.team || 'FA';
      const k = kickoffMap[team];
      const line = `• ${nameOf(p)} (${p.position || '?'}, ${team}) — ${fmtKickoff(k?.kickoff_utc)} ${tagsFor(p, !!k?.is_tnf)}`;
      return line.trim();
    };

    // simple risk notes
    const riskNotes: string[] = [];
    const hasTNFQ = starters.some((pid) => {
      const p = allPlayers[String(pid)] || {};
      const team = p?.team;
      const k = team ? kickoffMap[team] : undefined;
      return k?.is_tnf && p?.injury_status && ['Questionable', 'Doubtful'].includes(p.injury_status);
    });
    if (hasTNFQ) riskNotes.push('⚠️ You have Q/D starters on TNF. Consider safer options unless upgraded by Thu afternoon.');

    const hasOut = starters.some((pid) => (allPlayers[String(pid)]?.injury_status === 'Out'));
    if (hasOut) riskNotes.push('⛔ A listed starter is Out.');

    await inter.editReply([
      `**Start/Sit — Week ${week}**`,
      '',
      '**Starters:**',
      ...(starters.length ? starters.map(fmt) : ['(none)']),
      '',
      '**Bench:**',
      ...(bench.length ? bench.map(fmt) : ['(none)']),
      '',
      ...(riskNotes.length ? riskNotes : []),
      '_TNF and injury tags included. Projections/AI coming next._'
    ].join('\n'));
  } catch (e) {
    console.error(e);
    await inter.editReply('Error building start/sit.');
  }
}
