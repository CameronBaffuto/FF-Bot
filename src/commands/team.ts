import { ChatInputCommandInteraction } from 'discord.js';
import { getLeague, getUsers, getRosters, getUserByUsername } from '../api/sleeper';
import { env } from '../config/env';

export async function teamCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });

  try {
    const league = await getLeague(env.SLEEPER_LEAGUE_ID);
    const users = await getUsers(env.SLEEPER_LEAGUE_ID);
    const rosters = await getRosters(env.SLEEPER_LEAGUE_ID);

    // 1) get user_id from .env first, else resolve via username
    let myUserId = process.env.SLEEPER_USER_ID;
    if (!myUserId && process.env.SLEEPER_USERNAME) {
      const u = await getUserByUsername(process.env.SLEEPER_USERNAME);
      myUserId = u?.user_id;
    }

    // 2) try to find by id; if not found, try by display_name matching
    let me = users.find((u: any) => myUserId && u.user_id === myUserId);
    if (!me && process.env.SLEEPER_USERNAME) {
      const uname = process.env.SLEEPER_USERNAME.toLowerCase();
      me = users.find((u: any) =>
        (u.username && u.username.toLowerCase() === uname) ||
        (u.display_name && u.display_name.toLowerCase() === uname)
      );
      if (me) myUserId = me.user_id;
    }

    if (!me) {
      // helpful debug output
      const names = users.map((u: any) => `${u.display_name ?? u.username} → ${u.user_id}`).join('\n');
      return inter.editReply(
        '❌ Could not find your user in this league.\n' +
        'Check SLEEPER_USERNAME (or SLEEPER_USER_ID) in .env.\n\n' +
        '**League users:**\n' + names
      );
    }

    const myRoster = rosters.find((r: any) => r.owner_id === me.user_id);
    if (!myRoster) return inter.editReply('❌ Could not find your roster (but your user is in the league).');

    const players = myRoster.players || [];
    const header = `**${me.display_name ?? me.username}** roster (${players.length} players):`;
    await inter.editReply([header, players.join(', ') || '(empty)'].join('\n'));
  } catch (e) {
    console.error(e);
    await inter.editReply('Error fetching team. Double-check SLEEPER_LEAGUE_ID and internet access.');
  }
}
