import { ChatInputCommandInteraction } from 'discord.js';
import { env } from '../config/env';

export async function postCommand(inter: ChatInputCommandInteraction) {
  const msg = inter.options.getString('message', true);
  const channel = await inter.client.channels.fetch(env.DISCORD_CHANNEL_ID);
  if (channel && 'send' in channel) {
    // @ts-ignore
    await channel.send(msg);
    await inter.reply({ content: 'Posted ✅', ephemeral: true });
  } else {
    await inter.reply({ content: 'Channel not found/accessible', ephemeral: true });
  }
}
