import { Test, TestingModule } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import {
  Client,
  GatewayIntentBits,
  Role,
  TextChannel,
} from '@mocks/discord.js';
import { DISCORD_CLIENT } from '../discord-client.token';

describe('DiscordService', () => {
  let service: DiscordService;
  let client: Client;

  beforeEach(() => {
    client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
      ],
    });
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        {
          provide: DISCORD_CLIENT,
          useValue: client,
        },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getGuild()', () => {
    it('should return client guilds', () => {
      expect(service.getGuilds().size).toEqual(1);
    });
  });

  describe('#getTextChannels()', () => {
    beforeEach(() => {
      client.guilds.cache
        .get('guild1')
        .channels.cache.set('text channel', new TextChannel('text channel'));
    });

    it('should return all text channels', () => {
      expect(service.getTextChannels('guild1').length).toEqual(1);
    });
  });

  describe('#getRoles()', () => {
    beforeEach(() => {
      client.guilds.cache
        .get('guild1')
        .roles.cache.set('test role', new Role('test role'));
    });

    it('should return all roles', () => {
      expect(service.getRoles('guild1').length).toEqual(1);
    });
  });
});
