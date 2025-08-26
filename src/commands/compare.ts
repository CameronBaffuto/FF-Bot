import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { env } from '../config/env';
import { getAllPlayersNFL, getUsers, getRosters, getStateNFL } from '../api/sleeper';
import { projectionFromPlayer } from '../services/projections';
import { adjustStats } from '../services/injury';
import { probAGreaterB } from '../services/ranking';
import { explainCompare } from '../ai/explain';

function findByName(dict: Record<string, any>, name: string) {
  const n = name.toLowerCase();
  const entries = Object.values(dict) as any[];
  // Prefer exact match on full_name, then includes
  let best = entries.find(p => (p.full_name || '').toLowerCase() === n);
  if (!best) best = entries.find(p => (p.full_name || '').toLowerCase().includes(n));
  return best;
}

export async function compareCommand(inter: ChatInputCommandInteraction) {
  await inter.deferReply({ ephemeral: true });
  try {
    const a = inter.options.getString('a', true);
    const b = inter.options.getString('b', true);

    const [dict, state] = await Promise.all([getAllPlayersNFL(), getStateNFL()]);
    const week = state?.week ?? 1;

    const A = findByName(dict, a);
    const B = findByName(dict, b);
    if (!A || !B) {
      await inter.editReply('Could not find one or both players. Try more exact names.');
      return;
    }

    const baseA = projectionFromPlayer({ ...A, player_id: A.player_id });
    const baseB = projectionFromPlayer({ ...B, player_id: B.player_id });
    const adjA = adjustStats(baseA.mean, baseA.stdev, (A.injury_status || 'OK') as any, false);
    const adjB = adjustStats(baseB.mean, baseB.stdev, (B.injury_status || 'OK') as any, false);

    const p = probAGreaterB(adjA.mean, adjA.stdev, adjB.mean, adjB.stdev);

    const explain = await explainCompare({
      week,
      A: { name: A.full_name, mean: adjA.mean, stdev: adjA.stdev, tags: [A.injury_status || 'OK'], opp: '' },
      B: { name: B.full_name, mean: adjB.mean, stdev: adjB.stdev, tags: [B.injury_status || 'OK'], opp: '' },
      pAGreaterB: p,
    });

    await inter.editReply([
      `**Compare — Week ${week}**`,
      `• ${A.full_name}: ${adjA.mean.toFixed(1)}±${adjA.stdev.toFixed(1)} (${A.injury_status || 'OK'})`,
      `• ${B.full_name}: ${adjB.mean.toFixed(1)}±${adjB.stdev.toFixed(1)} (${B.injury_status || 'OK'})`,
      `P(${A.full_name} > ${B.full_name}) = ${Math.round(p * 100)}%`,
      '',
      explain ? '**Why (AI):**\n' + explain : '_Add OPENAI_API_KEY to get AI rationale._',
    ].join('\n'));
  } catch (e) {
    console.error(e);
    await inter.editReply('Error running compare.');
  }
}

/** Export a builder if you want to register via code generation elsewhere. */
export const compareSlash = new SlashCommandBuilder()
  .setName('compare')
  .setDescription('Compare two players for this week')
  .addStringOption(o => o.setName('a').setDescription('Player A name').setRequired(true))
  .addStringOption(o => o.setName('b').setDescription('Player B name').setRequired(true));
