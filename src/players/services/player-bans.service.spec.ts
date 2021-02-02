import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBansService } from './player-bans.service';
import { getModelToken, TypegooseModule } from 'nestjs-typegoose';
import { PlayerBan } from '../models/player-ban';
import { OnlinePlayersService } from './online-players.service';
import { ObjectId } from 'mongodb';
import { typegooseTestingModule } from '@/utils/testing-typegoose-module';
import { ReturnModelType, DocumentType } from '@typegoose/typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Environment } from '@/environment/environment';
import { PlayersService } from './players.service';
import { Player } from '../models/player';
import { DiscordService } from '@/discord/services/discord.service';
import { Events } from '@/events/events';

jest.mock('./players.service');
jest.mock('@/discord/services/discord.service');

class OnlinePlayersServiceStub {
  getSocketsForPlayer(playerId: string) { return []; }
}

const environment = {
  clientUrl: 'FAKE_CLIENT_URL',
};

describe('PlayerBansService', () => {
  let service: PlayerBansService;
  let mongod: MongoMemoryServer;
  let discordService: DiscordService;
  let playerBanModel: ReturnModelType<typeof PlayerBan>;
  let mockPlayerBan: DocumentType<PlayerBan>;
  let onlinePlayersService: OnlinePlayersServiceStub;
  let playersService: PlayersService;
  let admin: DocumentType<Player>;
  let player: DocumentType<Player>;
  let events: Events;

  beforeAll(() => mongod = new MongoMemoryServer());
  afterAll(async () => mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        typegooseTestingModule(mongod),
        TypegooseModule.forFeature([ PlayerBan, Player ]),
      ],
      providers: [
        PlayerBansService,
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        DiscordService,
        { provide: Environment, useValue: environment },
        PlayersService,
        Events,
      ],
    }).compile();

    service = module.get<PlayerBansService>(PlayerBansService);
    discordService = module.get(DiscordService);
    playerBanModel = module.get(getModelToken('PlayerBan'));
    onlinePlayersService = module.get(OnlinePlayersService);
    playersService = module.get(PlayersService);
    events = module.get(Events);
  });

  beforeEach(async () => {
    // @ts-expect-error
    admin = await playersService._createOne();

    // @ts-expect-error
    player = await playersService._createOne();

    const end = new Date();
    end.setHours(end.getHours() + 1);

    mockPlayerBan = await playerBanModel.create({
      player: player._id,
      admin: admin._id,
      start: new Date(),
      end,
      reason: 'FAKE_BAN_REASON',
    });
  });

  beforeEach(() => service.onModuleInit());

  // @ts-expect-error
  afterEach(async () => await playersService._reset());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    it('should return the ban by its id', async () => {
      const ret = await service.getById(mockPlayerBan.id);
      expect(ret.id).toEqual(mockPlayerBan.id);
    });
  });

  describe('#getPlayerBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerBans(player.id);
      expect(ret.map(r => r.toJSON())).toEqual([ mockPlayerBan.toJSON() ]);
    });
  });

  describe('#getPlayerActiveBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerActiveBans(player.id);
      expect(ret.map(r => r.toJSON())).toEqual([ mockPlayerBan.toJSON() ]);
    });
  });

  describe('#addPlayerBan()', () => {
    describe('when adding a valid ban', () => {
      let newBan: PlayerBan;

      beforeEach(() => {
        const end = new Date();
        end.setHours(end.getHours() + 1);

        newBan = {
          player: player._id,
          admin: admin._id,
          start: new Date(),
          end,
          reason: 'just testing',
        };
      });

      it('should create the ban and return it', async () => {
        const ret = await service.addPlayerBan(newBan);
        expect(ret.toObject()).toMatchObject(newBan);
      });

      it('should emit the playerBanAdded event', async () => new Promise<void>(resolve => {
        events.playerBanAdded.subscribe(({ ban }) => {
          expect(ban.player.toString()).toEqual(player.id);
          resolve();
        });

        service.addPlayerBan(newBan);
      }));

      it('should notify on discord', async () => {
        const spy = jest.spyOn(discordService.getAdminsChannel(), 'send');
        await service.addPlayerBan(newBan);
        expect(spy).toHaveBeenCalled();
      });

      it('should emit profile update event on player\'s socket', async () => new Promise<void>(resolve => {
        const socket = {
          emit: (eventName: string, update: any) => {
            expect(eventName).toEqual('profile update');
            expect(update.bans.length).toEqual(2);
            resolve();
          },
        };

        onlinePlayersService.getSocketsForPlayer = () => [ socket ];
        service.addPlayerBan(newBan);
      }));
    });

    describe('when adding a ban that has invalid player id', () => {
      let invalidBan: PlayerBan;

      beforeEach(() => {
        const end = new Date();
        end.setHours(end.getHours() + 1);

        invalidBan = {
          player: new ObjectId().toString(),
          admin,
          start: new Date(),
          end,
          reason: 'just testing',
        };
      });

      it('should throw an error', async () => {
        await expect(service.addPlayerBan(invalidBan)).rejects.toThrowError();
      });
    });
  });

  describe('#revokeBan()', () => {
    it('should revoke the ban', async () => {
      const ban = await service.revokeBan(mockPlayerBan.id, admin.id);
      expect(ban.end.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should emit the playerBanRevoked event', async () => new Promise<void>(resolve => {
      events.playerBanRevoked.subscribe(({ ban }) => {
        expect(ban.player.toString()).toEqual(player.id);
        resolve();
      });

      service.revokeBan(mockPlayerBan.id, admin.id);
    }));

    it('should send discord notification', async () => {
      const spy = jest.spyOn(discordService.getAdminsChannel(), 'send');
      const ban = await service.revokeBan(mockPlayerBan.id, admin.id);
      expect(spy).toHaveBeenCalled();
    });

    describe('when attempting to revoke an already expired ban', () => {
      beforeEach(async () => {
        mockPlayerBan.end = new Date();
        await mockPlayerBan.save();
      });

      it('should reject', async () => {
        await expect(service.revokeBan(mockPlayerBan.id, admin.id)).rejects.toThrowError();
      });
    });

    describe('when the provided admin does not exist', () => {
      it('should reject', async () => {
        await expect(service.revokeBan(mockPlayerBan.id, new ObjectId().toString())).rejects.toThrowError();
      });
    });
  });
});
