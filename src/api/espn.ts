import axios from 'axios';

/** ESPN weekly scoreboard — includes ISO kickoff dates per game */
export async function getWeekScoreboard(week: number) {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  const { data } = await axios.get(url, { params: { week, seasontype: 2 } });
  return data;
}

/** Build a quick lookup: TEAM_ABBR -> { kickoff_utc, is_tnf, opponentAbbr } */
export function buildKickoffMap(scoreboard: any): Record<string, { kickoff_utc: string; is_tnf: boolean; opp?: string }> {
  const map: Record<string, { kickoff_utc: string; is_tnf: boolean; opp?: string }> = {};
  for (const ev of scoreboard?.events ?? []) {
    const kickoff = ev?.date;
    const isThu = new Date(kickoff).getUTCDay() === 4; // Thursday = 4
    for (const comp of ev?.competitions ?? []) {
      const comps = comp?.competitors ?? [];
      if (comps.length === 2) {
        const a = comps[0]?.team?.abbreviation;
        const b = comps[1]?.team?.abbreviation;
        if (a) map[a] = { kickoff_utc: kickoff, is_tnf: isThu, opp: b };
        if (b) map[b] = { kickoff_utc: kickoff, is_tnf: isThu, opp: a };
      } else {
        for (const c of comps) {
          const abbr = c?.team?.abbreviation;
          if (abbr) map[abbr] = { kickoff_utc: kickoff, is_tnf: isThu };
        }
      }
    }
  }
  return map;
}
