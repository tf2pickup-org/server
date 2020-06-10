import { Test, TestingModule } from '@nestjs/testing';
import { DiscordService } from './discord.service';
import { Client, queueChannel, pickupsRole, adminChannel } from '@mocks/discord.js';
import { Environment } from '@/environment/environment';

class EnvironmentStub {
  discordBotToken = 'FAKE_DISCORD_BOT_TOKEN';
  discordGuild = 'FAKE_GUILD';
  discordQueueNotificationsMentionRole = pickupsRole.name;
  discordQueueNotificationsChannel = queueChannel.name;
  discordAdminNotificationsChannel = adminChannel.name;
};

describe('DiscordService', () => {
  let service: DiscordService;
  let client: Client;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscordService,
        { provide: Environment, useClass: EnvironmentStub },
      ],
    }).compile();

    service = module.get<DiscordService>(DiscordService);
    client = Client._instance;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#onModuleInit()', () => {
    it('should login', () => {
      const spy = jest.spyOn(client, 'login');
      service.onModuleInit();
      client.emit('ready');
      expect(spy).toHaveBeenCalledWith('FAKE_DISCORD_BOT_TOKEN');
    });
  });

  describe('when logged in', () => {
    beforeEach(() => {
      service.onModuleInit();
      client.emit('ready');
    });

    describe('#getAdminsChannel()', () => {
      it('should return admins channel', () => {
        expect(service.getAdminsChannel()).toBe(adminChannel);
      });
    });
  });

});
