import { ChatInputCommandInteraction } from 'discord.js';
export async function pingCommand(inter: ChatInputCommandInteraction) {
  await inter.reply({ content: 'pong 🏈', ephemeral: true });
}
