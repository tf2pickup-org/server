import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBansService } from './player-bans.service';
import { getModelToken } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { Types } from 'mongoose';
import { OnlinePlayersService } from './online-players.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';

const playerBanModel = {
  find: (obj: any) => ({ sort: () => null }),
  findById: (id: string) => null,
  create: (obj: any) => obj,
};

class OnlinePlayersServiceStub {

}

class DiscordNotificationsServiceStub {
  notifyBanAdded(ban: any) { return null; }
  notifyBanRevoked(ban: any) { return null; }
}

describe('PlayerBansService', () => {
  let service: PlayerBansService;
  let discordNotificationsService: DiscordNotificationsServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerBansService,
        { provide: getModelToken('PlayerBan'), useValue: playerBanModel },
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        { provide: DiscordNotificationsService, useClass: DiscordNotificationsServiceStub },
      ],
    }).compile();

    service = module.get<PlayerBansService>(PlayerBansService);
    discordNotificationsService = module.get(DiscordNotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const spy = jest.spyOn(playerBanModel, 'findById');
      await service.getById('FAKE_BAN_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_BAN_ID');
    });
  });

  describe('#getPlayerBans()', () => {
    it('should query model', async () => {
      const spy = jest.spyOn(playerBanModel, 'find');
      await service.getPlayerBans('FAKE_PLAYER_ID');
      expect(spy).toHaveBeenCalledWith({ player: 'FAKE_PLAYER_ID' });
    });
  });

  describe('#getPlayerActiveBans()', () => {
    it('should query model', async () => {
      const spy = jest.spyOn(playerBanModel, 'find');
      await service.getPlayerActiveBans('FAKE_PLAYER_ID');
      expect(spy).toHaveBeenCalledWith({
        player: 'FAKE_PLAYER_ID',
        end: {
          $gte: jasmine.any(Date),
        },
      });
    });
  });

  describe('#addPlayerBan()', () => {
    let ban: Partial<PlayerBan>;

    beforeEach(() => {
      const end = new Date();
      end.setHours(end.getHours() + 1);

      ban = {
        player: new Types.ObjectId(),
        admin: new Types.ObjectId(),
        start: new Date(),
        end,
        reason: 'just testing',
      };
    });

    it('should create ban via model', async () => {
      const spy = jest.spyOn(playerBanModel, 'create');
      await service.addPlayerBan(ban);
      expect(spy).toHaveBeenCalledWith(ban);
    });

    it('should emit the event', async done => {
      service.banAdded.subscribe(playerId => {
        expect(playerId).toEqual(ban.player.toString());
        done();
      });

      await service.addPlayerBan(ban);
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifyBanAdded');
      await service.addPlayerBan(ban);
      expect(spy).toHaveBeenCalledWith(ban);
    });
  });

  describe('#revokeBan()', () => {
    let ban: any;

    beforeEach(() =>  {
      const end = new Date();
      end.setHours(end.getHours() + 1);

      ban = {
        player: new Types.ObjectId(),
        admin: new Types.ObjectId(),
        start: new Date(),
        end,
        reason: 'just testing',
        save: () => new Promise(resolve => resolve(null)),
      };
    });

    it('should revoke the ban', async () => {
      const spy = jest.spyOn(playerBanModel, 'findById').mockResolvedValue(ban);
      const saveSpy = jest.spyOn(ban, 'save');

      await service.revokeBan('FAKE_BAN_ID');
      expect(spy).toHaveBeenCalledWith('FAKE_BAN_ID');
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should emit the event', async done => {
      service.banRevoked.subscribe(playerId => {
        expect(playerId).toEqual(ban.player.toString());
        done();
      });

      jest.spyOn(playerBanModel, 'findById').mockResolvedValue(ban);
      await service.revokeBan('FAKE_BAN_ID');
    });

    it('should send discord notification', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifyBanRevoked');
      spyOn(playerBanModel, 'findById').and.returnValue(new Promise(resolve => resolve(ban)));
      await service.revokeBan('FAKE_BAN_ID');
      expect(spy).toHaveBeenCalledWith(ban);
    });
  });
});
