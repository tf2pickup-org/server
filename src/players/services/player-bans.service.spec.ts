import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBansService } from './player-bans.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { Types } from 'mongoose';
import { OnlinePlayersService } from './online-players.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

class OnlinePlayersServiceStub {
  getSocketsForPlayer(playerId: string) { return []; }
}

class DiscordNotificationsServiceStub {
  notifyBanAdded(ban: any) { return null; }
  notifyBanRevoked(ban: any) { return null; }
}

describe('PlayerBansService', () => {
  let service: PlayerBansService;
  let mongod: MongoMemoryServer;
  let discordNotificationsService: DiscordNotificationsServiceStub;
  let playerBanModel: ReturnModelType<typeof PlayerBan>;
  let playerBan: DocumentType<PlayerBan>;
  let onlinePlayersService: OnlinePlayersServiceStub;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ PlayerBan ]),
      ],
      providers: [
        PlayerBansService,
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        { provide: DiscordNotificationsService, useClass: DiscordNotificationsServiceStub },
      ],
    }).compile();

    service = module.get<PlayerBansService>(PlayerBansService);
    discordNotificationsService = module.get(DiscordNotificationsService);
    playerBanModel = module.get(getModelToken('PlayerBan'));
    onlinePlayersService = module.get(OnlinePlayersService);
  });

  beforeEach(() => service.onModuleInit());

  beforeEach(async () => {
    const end = new Date();
    end.setHours(end.getHours() + 1);

    playerBan = await playerBanModel.create({
      player: new ObjectId(),
      admin: new ObjectId(),
      start: new Date(),
      end,
      reason: 'TESTING PLAYER BANS',
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    it('should query model', async () => {
      const ret = await service.getById(playerBan.id);
      expect(ret.toJSON()).toEqual(playerBan.toJSON());
    });
  });

  describe('#getPlayerBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerBans(playerBan.player.toString());
      expect(ret.map(r => r.toJSON())).toEqual([ playerBan.toJSON() ]);
    });
  });

  describe('#getPlayerActiveBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerActiveBans(playerBan.player.toString());
      expect(ret.map(r => r.toJSON())).toEqual([ playerBan.toJSON() ]);
    });
  });

  describe('#addPlayerBan()', () => {
    let ban: Partial<PlayerBan>;

    beforeEach(() => {
      const end = new Date();
      end.setHours(end.getHours() + 1);

      ban = {
        player: new ObjectId(),
        admin: new ObjectId(),
        start: new Date(),
        end,
        reason: 'just testing',
      };
    });

    it('should create ban via model', async () => {
      const ret = await service.addPlayerBan(ban);
      expect(ret.toObject()).toMatchObject(ban);
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
      const ret = await service.addPlayerBan(ban);
      expect(spy).toHaveBeenCalledWith(ret);
    });

    it('should emit profile update event on the player\' socket', async done => {
      const socket = { emit: (...args: any[]) => done() };
      jest.spyOn(onlinePlayersService, 'getSocketsForPlayer').mockReturnValue([ socket ]);
      const spy = jest.spyOn(socket, 'emit');

      await service.addPlayerBan(ban);
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
