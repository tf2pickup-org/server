import { Test, TestingModule } from '@nestjs/testing';
import { DiscordNotificationsService } from './discord-notifications.service';
import { Environment } from '@/environment/environment';
import { ConfigService } from '@nestjs/config';
import { Client, TextChannel } from 'discord.js';
import { MessageEmbedFactoryService } from './message-embed-factory.service';
import { PlayersService } from '@/players/services/players.service';

class EnvironmentStub {
  discordBotToken = 'FAKE_DISCORD_BOT_TOKEN';
  discordQueueNotificationsChannel = 'queue';
}

class ConfigServiceStub {
  get(key: string) {
    switch (key) {
      case 'discordNotifications.promptJoinQueueMentionRole':
        return 'FAKE_ROLE';

      default:
        return null;
    }
  }
}

class PlayersServiceStub {

}

jest.mock('discord.js');

describe('DiscordNotificationsService', () => {
  let service: DiscordNotificationsService;
  let client: Client;

  beforeEach(() => {
    (Client as any as jest.MockedClass<typeof Client>).mockClear();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordNotificationsService,
        { provide: Environment, useClass: EnvironmentStub },
        { provide: ConfigService, useClass: ConfigServiceStub },
        { provide: PlayersService, useClass: PlayersServiceStub },
        MessageEmbedFactoryService,
      ],
    }).compile();

    service = module.get<DiscordNotificationsService>(DiscordNotificationsService);
  });

  beforeEach(() => {
    client = (Client as any as jest.MockedClass<typeof Client>).mock.instances[0];
    client.user = { tag: 'bot#1337' } as any;

    jest.spyOn(client, 'login').mockResolvedValue('FAKE_DISCORD_BOT_TOKEN');
    jest.spyOn(client, 'on').mockImplementation((event, listener) => {
      if (event === 'ready') {
        listener();
      }
      return client;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create the Client instance', () => {
    expect(Client).toHaveBeenCalledTimes(1);
  });

  describe('#onModuleInit()', () => {
    it('should login', () => {
      const spy = jest.spyOn(client, 'login');
      service.onModuleInit();
      expect(spy).toHaveBeenCalledWith('FAKE_DISCORD_BOT_TOKEN');
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      service.onModuleInit();
    });

    describe('#notifyQueue()', () => {

    });
  });
});
