import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { env } from './config/env';

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('pong'),
  new SlashCommandBuilder().setName('post').setDescription('Post a message via the bot')
    .addStringOption(o => o.setName('message').setDescription('Text to post').setRequired(true)),
  new SlashCommandBuilder().setName('team').setDescription('Show my roster'),
  new SlashCommandBuilder().setName('startsit').setDescription('Show starters/bench for this week'),
  new SlashCommandBuilder().setName('waivers').setDescription('AI waiver suggestions'),
  new SlashCommandBuilder().setName('lineup').setDescription('AI lineup for the week'),
  new SlashCommandBuilder().setName('compare').setDescription('Compare two players for this week')
    .addStringOption(o => o.setName('a').setDescription('Player A name').setRequired(true))
    .addStringOption(o => o.setName('b').setDescription('Player B name').setRequired(true)),
].map(c => c.toJSON());

async function main() {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(env.DISCORD_APP_ID, env.DISCORD_GUILD_ID),
    { body: commands }
  );
  console.log('Registered slash commands for guild:', env.DISCORD_GUILD_ID);
}
main().catch(err => { console.error(err); process.exit(1); });
