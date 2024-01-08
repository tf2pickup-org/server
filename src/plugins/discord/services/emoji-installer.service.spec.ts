import { Test, TestingModule } from '@nestjs/testing';
import { EmojiInstallerService } from './emoji-installer.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Events } from '@/events/events';
import { Client, GatewayIntentBits } from '@mocks/discord.js';
import { GuildEmoji } from 'discord.js';
import { DISCORD_CLIENT } from '../discord-client.token';

jest.mock('@/configuration/services/configuration.service');

describe('EmojiInstallerService', () => {
  let service: EmojiInstallerService;
  let client: Client;
  let configurationService: jest.Mocked<ConfigurationService>;

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
        EmojiInstallerService,
        ConfigurationService,
        Events,
        {
          provide: DISCORD_CLIENT,
          useValue: client,
        },
      ],
    }).compile();

    service = module.get<EmojiInstallerService>(EmojiInstallerService);
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(() => {
    configurationService.get.mockImplementation((key) =>
      Promise.resolve(
        {
          'discord.guilds': [
            {
              id: 'guild1',
            },
          ],
        }[key],
      ),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#installEmojis()', () => {
    it('should install emojis', async () => {
      const guild = client.guilds.cache.get('guild1');
      await service.installEmojis(guild);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2scout',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2soldier',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2pyro',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2demoman',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2heavy',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2engineer',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2medic',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some(
          (emoji: GuildEmoji) => emoji.name === 'tf2sniper',
        ),
      ).toBe(true);
      expect(
        guild.emojis.cache.some((emoji: GuildEmoji) => emoji.name === 'tf2spy'),
      ).toBe(true);
    });
  });
});
