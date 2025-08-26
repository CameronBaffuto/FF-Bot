import axios from 'axios';

export async function getWeekScoreboard(week: number) {
  const url = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard';
  const { data } = await axios.get(url, { params: { week, seasontype: 2 } });
  return data;
}


export function buildKickoffMap(scoreboard: any): Record<string, { kickoff_utc: string; is_tnf: boolean }> {
  const map: Record<string, { kickoff_utc: string; is_tnf: boolean }> = {};
  for (const ev of scoreboard?.events ?? []) {
    const kickoff = ev?.date;
    const isThu = new Date(kickoff).getUTCDay() === 4; 
    for (const comp of ev?.competitions ?? []) {
      for (const c of comp?.competitors ?? []) {
        const abbr = c?.team?.abbreviation;
        if (abbr) map[abbr] = { kickoff_utc: kickoff, is_tnf: isThu };
      }
    }
  }
  return map;
}
