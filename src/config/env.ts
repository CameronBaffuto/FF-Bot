import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
    DISCORD_TOKEN: z.string().min(1),
    DISCORD_APP_ID: z.string().min(1),    
    DISCORD_GUILD_ID: z.string().min(1),
    DISCORD_CHANNEL_ID: z.string().min(1),
    TZ: z.string().default('America/New_York'),
    SLEEPER_LEAGUE_ID: z.string().min(1),
    SLEEPER_USER_ID: z.string().min(1),
});

export const env = schema.parse(process.env);
