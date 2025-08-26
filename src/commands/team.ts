// src/commands/team.ts
import { ChatInputCommandInteraction } from 'discord.js';
import { getUsers, getRosters, getAllPlayersNFL } from '../api/sleeper';
import { env } from '../config/env';
import mockRoster from '../mock/roster.json';

// --- helpers ---
function nameOf(p: any): string {
  return (
    p?.full_name ||
    [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
    'Unknown'
  );
}

function tagsFor(p: any): string {
  const t: string[] = [];
  if (p?.injury_status === 'Questionable') t.push('⚠️ Q');
  if (p?.injury_status === 'Doubtful') t.push('🟠 D');
  if (p?.injury_status === 'Out') t.push('⛔ Out');
  return t.join(' ');
}

// --- command ---
export async function teamCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });

  try {
    const [users, rosters, allPlayers] = await Promise.all([
      getUsers(env.SLEEPER_LEAGUE_ID),
      getRosters(env.SLEEPER_LEAGUE_ID),
      getAllPlayersNFL(),
    ]);

    // resolve myself
    const uname = (process.env.SLEEPER_USERNAME || '').toLowerCase();
    const me = users.find(
      (u: any) =>
        u.user_id === process.env.SLEEPER_USER_ID ||
        (u.username && u.username.toLowerCase() === uname) ||
        (u.display_name && u.display_name.toLowerCase() === uname)
    );

    // roster (with mock fallback if empty)
    let roster: any = me
      ? rosters.find((r: any) => r.owner_id === me.user_id)
      : null;

    if (!roster || !roster.players?.length) {
      roster = mockRoster;
    }

    const pids: string[] = roster.players || [];
    const lines = pids.map((pid) => {
      const p = allPlayers[String(pid)] || {};
      const pos = p?.position || '?';
      const team = p?.team || 'FA';
      const tags = tagsFor(p);
      return `• ${nameOf(p)} (${pos}, ${team})${tags ? ' — ' + tags : ''}`;
    });

    await inter.editReply(
      [
        `**${me?.display_name ?? me?.username ?? 'Mock User'} — Roster (${
          pids.length
        })**`,
        ...(lines.length ? lines : ['(empty)']),
      ].join('\n')
    );
  } catch (e) {
    console.error(e);
    await inter.editReply('Error fetching team.');
  }
}
