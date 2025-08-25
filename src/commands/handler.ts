import { ChatInputCommandInteraction } from 'discord.js';
import { pingCommand } from './ping';
import { postCommand } from './post';
import { teamCommand } from './team';

export async function handleInteraction(inter: any) {
  if (!inter?.isChatInputCommand?.()) return;

  if (inter.commandName === 'ping') return pingCommand(inter as ChatInputCommandInteraction);
  if (inter.commandName === 'post') return postCommand(inter as ChatInputCommandInteraction);
  if (inter.commandName === 'team') return teamCommand(inter as ChatInputCommandInteraction);
}
