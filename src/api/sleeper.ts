import axios from 'axios';

const BASE = 'https://api.sleeper.app/v1';

export async function getLeague(leagueId: string) {
  const { data } = await axios.get(`${BASE}/league/${leagueId}`);
  return data;
}

export async function getUsers(leagueId: string) {
  const { data } = await axios.get(`${BASE}/league/${leagueId}/users`);
  return data;
}

export async function getRosters(leagueId: string) {
  const { data } = await axios.get(`${BASE}/league/${leagueId}/rosters`);
  return data;
}

export async function getMatchups(leagueId: string, week: number) {
  const { data } = await axios.get(`${BASE}/league/${leagueId}/matchups/${week}`);
  return data;
}

export async function getUserByUsername(username: string) {
  const { data } = await axios.get(`${BASE}/user/${encodeURIComponent(username)}`);
  return data;
}

export async function getAllPlayersNFL(): Promise<Record<string, any>> {
  const { data } = await axios.get(`${BASE}/players/nfl`);
  return data;
}

export async function getStateNFL() {
  const { data } = await axios.get(`${BASE}/state/nfl`);
  return data; 
}

export async function getTrendingAdds(hours = 24 * 7) {
  const { data } = await axios.get(`${BASE}/players/nfl/trending/add`, {
    params: { lookback_hours: hours, limit: 200 }
  });
  return data;
}


