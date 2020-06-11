import { Test, TestingModule } from '@nestjs/testing';
import { DiscordNotificationsService, TargetChannel } from './discord-notifications.service';
import { Environment } from '@/environment/environment';
import { ConfigService } from '@nestjs/config';
import { MessageEmbedFactoryService } from './message-embed-factory.service';
import { PlayersService } from '@/players/services/players.service';
import { Client, playersChannel, pickupsRole, adminChannel } from '@mocks/discord.js';
import { MessageEmbed } from 'discord.js';
import { ObjectId } from 'mongodb';

class EnvironmentStub {
  discordBotToken = 'FAKE_DISCORD_BOT_TOKEN';
  discordGuild = 'FAKE_GUILD';
  discordQueueNotificationsMentionRole = pickupsRole.name;
  discordQueueNotificationsChannel = playersChannel.name;
  discordAdminNotificationsChannel = adminChannel.name;
};

class ConfigServiceStub {
  get(key: string) {
    switch (key) {
      default:
        return null;
    }
  }
}

class PlayersServiceStub {
  getById() { return Promise.resolve({ name: 'FAKE_PLAYER' }); }
}

describe('DiscordNotificationsService', () => {
  let service: DiscordNotificationsService;
  let environment: EnvironmentStub;
  let client: Client;

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
    environment = module.get(Environment);
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

    describe('#notifyQueue()', () => {
      describe('when the role to mention exists and is mentionable', () => {
        it('should send the message mentioning the role', () => {
          const spy = jest.spyOn(playersChannel, 'send');
          service.notifyQueue(6, 12);
          expect(spy).toHaveBeenCalledWith(expect.stringMatching('&<pickups> 6/12'));
        });
      });

      describe('when the role to mention exists but is not mentionable', () => {
        beforeEach(() => {
          pickupsRole.mentionable = false;
        });

        it('should send the message without mentioning the role', () => {
          const spy = jest.spyOn(playersChannel, 'send');
          service.notifyQueue(6, 12);
          expect(spy).toHaveBeenCalledWith(expect.stringMatching('6/12'));
        });
      });

      describe('when the role to mention does not exist', () => {
        beforeEach(() => {
          environment.discordQueueNotificationsMentionRole = 'foo';
        });

        it('should send the message without mentioning the role', () => {
          const spy = jest.spyOn(playersChannel, 'send');
          service.notifyQueue(6, 12);
          expect(spy).toHaveBeenCalledWith(expect.stringMatching('6/12'));
        });
      });

      describe('when the channel does not exist', () => {
        beforeEach(() => {
          environment.discordQueueNotificationsChannel = 'foo';
        });

        it('should not send any messages', () => {
          const spy = jest.spyOn(playersChannel, 'send');
          service.notifyQueue(6, 12);
          expect(spy).not.toHaveBeenCalled();
        });
      });
    });

    describe('#sendNotification()', () => {
      let notification: MessageEmbed;

      beforeEach(() => {
        notification = new MessageEmbed().setTitle('test');
      });

      describe('when the channel exists', () => {
        it('should send a notification to the queue channel', async () => {
          const spy = jest.spyOn(playersChannel, 'send');
          await service.sendNotification(TargetChannel.Queue, notification);
          expect(spy).toHaveBeenCalledWith(notification);
        });

        it('should send a notification to the admins channel', async () => {
          const spy = jest.spyOn(adminChannel, 'send');
          await service.sendNotification(TargetChannel.Admins, notification);
          expect(spy).toHaveBeenCalledWith(notification);
        });
      });

      describe('when the channel does not exist', () => {
        beforeEach(() => {
          environment.discordQueueNotificationsChannel = 'foo';
          environment.discordAdminNotificationsChannel = 'bar';
        });

        it('should not send anything', async () => {
          const spy = jest.spyOn(playersChannel, 'send');
          await service.sendNotification(TargetChannel.Queue, notification);
          expect(spy).not.toHaveBeenCalled();
        });
      });

      describe('when the channel is not specified', () => {
        beforeEach(() => {
          delete environment.discordQueueNotificationsChannel;
        });

        it('should not send anything', async () => {
          const spy = jest.spyOn(playersChannel, 'send');
          await service.sendNotification(TargetChannel.Queue, notification);
          expect(spy).not.toHaveBeenCalled();
        });
      });
    });

    describe('#notifySubstituteRequest()', () => {
      it('should send a notification to the queue channel', async () => {
        const spy = jest.spyOn(playersChannel, 'send');
        await service.notifySubstituteRequest({ gameId: 'FAKE_GAME', gameNumber: 3, gameClass: 'soldier', team: 'RED' });
        expect(spy).toHaveBeenCalledWith(expect.any(MessageEmbed));
      });
    });

    describe('#notifyPlayerBanAdded()', () => {
      it('should send a notification to the admin channel', async () => {
        const spy = jest.spyOn(adminChannel, 'send');
        await service.notifyPlayerBanAdded({ player: new ObjectId(), admin: new ObjectId(), start: new Date(),
            end: new Date() });
        expect(spy).toHaveBeenCalledWith(expect.any(MessageEmbed));
      });
    });

    describe('#notifyPlayerBanRevoked()', () => {
      it('should send a notification to the admin channel', async () => {
        const spy = jest.spyOn(adminChannel, 'send');
        await service.notifyPlayerBanRevoked({ player: new ObjectId(), admin: new ObjectId(), start: new Date(),
            end: new Date() });
        expect(spy).toHaveBeenCalledWith(expect.any(MessageEmbed));
      });
    });

    describe('#notifyNewPlayer()', () => {
      it('should send a notification to the admin channel', async () => {
        const spy = jest.spyOn(adminChannel, 'send');
        await service.notifyNewPlayer({ id: 'FAKE_PLAYER_ID', name: 'FAKE_PLAYER', steamId: 'FAKE_STEAM_ID', hasAcceptedRules: true });
        expect(spy).toHaveBeenCalledWith(expect.any(MessageEmbed));
      });
    });

    describe('#notifyNameChange()', () => {
      it('should send a notification to the admin channel', async () => {
        const spy = jest.spyOn(adminChannel, 'send');
        await service.notifyNameChange({ id: 'FAKE_PLAYER_ID', name: 'FAKE_PLAYER', steamId: 'FAKE_STEAM_ID', hasAcceptedRules: true }, 'OLD_NAME');
        expect(spy).toHaveBeenCalledWith(expect.any(MessageEmbed));
      });
    });

    describe('#notifySkillChange()', () => {
      it('should send a notification to the admin channel', async () => {
        const spy = jest.spyOn(adminChannel, 'send');
        await service.notifySkillChange('FAKE_PLAYER_ID', new Map([['scout', 1]]), new Map([['scout', 2]]));
        expect(spy).toHaveBeenLastCalledWith(expect.any(MessageEmbed));
      });
    });
  });
});
