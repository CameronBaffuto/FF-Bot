import { Client, GatewayIntentBits } from 'discord.js';
import { env } from './config/env';
import { handleInteraction } from './commands/handler';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`[bot] Logged in as ${client.user?.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  try { await handleInteraction(interaction); }
  catch (e) { console.error(e); }
});

client.login(env.DISCORD_TOKEN);
