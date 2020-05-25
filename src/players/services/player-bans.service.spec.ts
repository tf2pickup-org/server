import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBansService } from './player-bans.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { OnlinePlayersService } from './online-players.service';
import { DiscordNotificationsService } from '@/discord/services/discord-notifications.service';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.mock('@/discord/services/discord-notifications.service');
jest.mock('./online-players.service');

describe('PlayerBansService', () => {
  let service: PlayerBansService;
  let mongod: MongoMemoryServer;
  let playerBanModel: ReturnModelType<typeof PlayerBan>;
  let discordNotificationsService: DiscordNotificationsService;
  let playerBan: DocumentType<PlayerBan>;
  let onlinePlayersService: OnlinePlayersService;

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
        OnlinePlayersService,
        DiscordNotificationsService,
      ],
    }).compile();

    service = module.get<PlayerBansService>(PlayerBansService);
    discordNotificationsService = module.get(DiscordNotificationsService);
    playerBanModel = module.get(getModelToken('PlayerBan'));
    onlinePlayersService = module.get(OnlinePlayersService);
  });

  beforeEach(() => {
    onlinePlayersService.getSocketsForPlayer = () => [];
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
      const ret = await service.getPlayerBans(playerBan.player as ObjectId);
      expect(ret.map(r => r.toJSON())).toEqual([ playerBan.toJSON() ]);
    });
  });

  describe('#getPlayerActiveBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerActiveBans(playerBan.player as ObjectId);
      expect(ret.map(r => r.toJSON())).toEqual([ playerBan.toJSON() ]);
    });
  });

  describe('#addPlayerBan()', () => {
    let mockBan: Partial<PlayerBan>;

    beforeEach(() => {
      const end = new Date();
      end.setHours(end.getHours() + 1);

      mockBan = {
        player: new ObjectId(),
        admin: new ObjectId(),
        start: new Date(),
        end,
        reason: 'just testing',
      };
    });

    it('should create ban via model', async () => {
      const ret = await service.addPlayerBan(mockBan);
      expect(ret.toObject()).toMatchObject(mockBan);
    });

    it('should emit the event', async done => {
      service.banAdded.subscribe(playerId => {
        expect(playerId.toString()).toEqual(mockBan.player.toString());
        done();
      });

      await service.addPlayerBan(mockBan);
    });

    it('should notify on discord', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifyPlayerBanAdded');
      const ret = await service.addPlayerBan(mockBan);
      expect(spy).toHaveBeenCalledWith(ret);
    });

    it('should emit profile update event on player\'s socket', async done => {
      const socket = {
        emit: (eventName: string, update: any) => {
          expect(eventName).toEqual('profile update');
          expect(update.bans.length).toEqual(1);
          done();
        },
      };

      // @ts-expect-error
      onlinePlayersService.getSocketsForPlayer = () => [ socket ];
      await service.addPlayerBan(mockBan);
    });
  });

  describe('#revokeBan()', () => {
    let mockBan: DocumentType<PlayerBan>;

    beforeEach(async () =>  {
      const end = new Date();
      end.setHours(end.getHours() + 1);

      mockBan = await playerBanModel.create({
        player: new ObjectId(),
        admin: new ObjectId(),
        start: new Date(),
        end,
        reason: 'just testing',
      });
    });

    it('should revoke the ban', async () => {
      const ban = await service.revokeBan(mockBan.id);
      expect(ban.end.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should emit the event', async done => {
      service.banRevoked.subscribe(playerId => {
        expect(playerId.toString()).toEqual(mockBan.player.toString());
        done();
      });

      await service.revokeBan(mockBan.id);
    });

    it('should send discord notification', async () => {
      const spy = jest.spyOn(discordNotificationsService, 'notifyPlayerBanRevoked');
      const ban = await service.revokeBan(mockBan.id);
      expect(spy).toHaveBeenCalledWith(ban);
    });
  });
});
