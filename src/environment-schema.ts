import * as Joi from 'joi';

const joi = new Proxy(Joi, {
  get(o, name) {
    // skipcq: JS-0323
    return (o as any)[name].bind(o);
  },
});

const { object, string, number, any, when, exist } = joi;

export const environmentSchema = object({
  NODE_ENV: string()
    .valid('development', 'production', 'test')
    .default('development'),
  WEBSITE_NAME: string().required(),
  API_URL: string().required(),
  CLIENT_URL: string().required(),
  BOT_NAME: string().required(),
  MONGODB_URI: string().required().uri(),
  REDIS_URL: string().required(),
  STEAM_API_KEY: string().required(),
  LOGS_TF_API_KEY: string().required(),
  KEY_STORE_PASSPHRASE: string().required(),
  SUPER_USER: string()
    .required()
    .pattern(/^\d{17}$/, { name: 'SteamID64' }),
  QUEUE_CONFIG: string()
    .valid('test', '6v6', '9v9', 'bball', 'ultiduo')
    .default('6v6'),
  LOG_RELAY_ADDRESS: string().required(),
  LOG_RELAY_PORT: number().required(),
  GAME_SERVER_SECRET: string()
    .required()
    .pattern(/[a-zA-Z0-9]+/),
  DISCORD_BOT_TOKEN: any().optional(),
  DISCORD_GUILD: any().optional(),
  DISCORD_QUEUE_NOTIFICATIONS_CHANNEL: any().optional(),
  DISCORD_QUEUE_NOTIFICATIONS_MENTION_ROLE: any().optional(),
  DISCORD_ADMIN_NOTIFICATIONS_CHANNEL: any().optional(),
  TWITCH_CLIENT_ID: any().optional(),
  TWITCH_CLIENT_SECRET: any().optional(),
  SERVEME_TF_API_ENDPOINT: when('SERVEME_TF_API_KEY', {
    is: exist(),
    then: string().required(),
    otherwise: any().optional(),
  }),
  SERVEME_TF_API_KEY: any().optional(),
});
