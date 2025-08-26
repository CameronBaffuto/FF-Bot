import { ChatInputCommandInteraction } from 'discord.js';
import { pingCommand } from './ping';
import { postCommand } from './post';
import { teamCommand } from './team';
import { startSitCommand } from './startsit';
import { waiversCommand } from './waivers';
import { lineupCommand } from './lineup';
import { compareCommand } from './compare';

export async function handleInteraction(inter: any) {
  if (!inter?.isChatInputCommand?.()) return;

  const i = inter as ChatInputCommandInteraction;
  if (i.commandName === 'ping') return pingCommand(i);
  if (i.commandName === 'post') return postCommand(i);
  if (i.commandName === 'team') return teamCommand(i);
  if (i.commandName === 'startsit') return startSitCommand(i);
  if (i.commandName === 'waivers') return waiversCommand(i);
  if (i.commandName === 'lineup') return lineupCommand(i);
  if (i.commandName === 'compare') return compareCommand(i);
}
