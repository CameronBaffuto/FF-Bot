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
  // returns { user_id, username, display_name, ... }
  return data;
}
