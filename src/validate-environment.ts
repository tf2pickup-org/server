import { z } from 'zod';

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    WEBSITE_NAME: z.string(),
    API_URL: z.string(),
    CLIENT_URL: z.string(),
    BOT_NAME: z.string(),
    MONGODB_URI: z.string().url(),
    REDIS_URL: z.string().optional(),
    REDIS_SOCKET: z.string().optional(),
    STEAM_API_KEY: z.string(),
    LOGS_TF_API_KEY: z.string(),
    KEY_STORE_PASSPHRASE: z.string(),
    SUPER_USER: z
      .string()
      .regex(/^\d{17}$/, 'SUPER_USER has to be a valid SteamID64'),
    QUEUE_CONFIG: z
      .enum(['test', '6v6', '9v9', 'bball', 'ultiduo'])
      .default('6v6'),
    LOG_RELAY_ADDRESS: z.string(),
    LOG_RELAY_PORT: z.string().regex(/\d+/),
    GAME_SERVER_SECRET: z.string().regex(/[a-zA-Z0-9]+/),
    DISCORD_BOT_TOKEN: z.string().optional(),
    TWITCH_CLIENT_ID: z.string().optional(),
    TWITCH_CLIENT_SECRET: z.string().optional(),
    SERVEME_TF_API_ENDPOINT: z.string().default('serveme.tf'),
    SERVEME_TF_API_KEY: z.string().optional(),
  })
  .refine(({ REDIS_URL, REDIS_SOCKET }) => REDIS_URL ?? REDIS_SOCKET, {
    message: 'either REDIS_URL or REDIS_SOCKET must be defined',
  });

export const validateEnvironment = (environment: Record<string, unknown>) => {
  return schema.parse(environment);
};
