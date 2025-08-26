import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { env } from './config/env';

const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('pong'),
  new SlashCommandBuilder().setName('post').setDescription('Post a message via the bot')
    .addStringOption(o => o.setName('message').setDescription('Text to post').setRequired(true)),
  new SlashCommandBuilder().setName('team').setDescription('Show my roster'),
  new SlashCommandBuilder().setName('startsit').setDescription('Show starters/bench for this week'),
  new SlashCommandBuilder().setName('waivers').setDescription('Trending free agents for your league'),
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
