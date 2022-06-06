import { TestingModule, Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Environment } from './environment';

jest.mock('@nestjs/config');

describe('Environment', () => {
  let environment: Environment;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Environment, ConfigService],
    }).compile();

    environment = module.get<Environment>(Environment);
    configService = module.get(ConfigService);

    configService.get = (varName) => varName;
  });

  it('should be defined', () => {
    expect(environment).toBeDefined();
  });

  [
    'API_URL',
    'CLIENT_URL',
    'BOT_NAME',
    'MONGODB_URI',
    'STEAM_API_KEY',
    // TODO v10: enable test below
    // 'KEY_STORE_PASSPHRASE',
    'SUPER_USER',
    'QUEUE_CONFIG',
    'LOG_RELAY_ADDRESS',
    'LOG_RELAY_PORT',
    'GAME_SERVER_SECRET',
    'DISCORD_BOT_TOKEN',
    'DISCORD_GUILD',
    'DISCORD_QUEUE_NOTIFICATIONS_CHANNEL',
    'DISCORD_QUEUE_NOTIFICATIONS_MENTION_ROLE',
    'DISCORD_ADMIN_NOTIFICATIONS_CHANNEL',
    'TWITCH_CLIENT_ID',
    'TWITCH_CLIENT_SECRET',
  ].forEach((varName) => {
    const getterName = varName
      .toLowerCase()
      .replace(/_(.)/g, (_, p1) => p1.toString().toUpperCase())
      .replace('mongodb', 'mongoDb');

    it(`should return value for ${getterName}`, () => {
      expect(environment[getterName]).toEqual(varName);
    });
  });
});
