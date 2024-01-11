import { Test, TestingModule } from '@nestjs/testing';
import { PlayerBansService } from './player-bans.service';
import { PlayerBan, playerBanSchema } from '../models/player-ban';
import { OnlinePlayersService } from './online-players.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { PlayersService } from './players.service';
import { Player, playerSchema } from '../models/player';
import { Events } from '@/events/events';
import { Connection, Error, Model, Types } from 'mongoose';
import {
  getConnectionToken,
  getModelToken,
  MongooseModule,
} from '@nestjs/mongoose';
import { PlayerId } from '../types/player-id';
import { PlayerBanId } from '../types/player-ban-id';

jest.mock('./players.service');

class OnlinePlayersServiceStub {
  getSocketsForPlayer(playerId: string) {
    return [];
  }
}

describe('PlayerBansService', () => {
  let service: PlayerBansService;
  let mongod: MongoMemoryServer;
  let playerBanModel: Model<PlayerBan>;
  let mockPlayerBan: PlayerBan;
  let onlinePlayersService: OnlinePlayersServiceStub;
  let playersService: PlayersService;
  let admin: Player;
  let player: Player;
  let events: Events;
  let connection: Connection;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          {
            name: Player.name,
            schema: playerSchema,
          },
          {
            name: PlayerBan.name,
            schema: playerBanSchema,
          },
        ]),
      ],
      providers: [
        PlayerBansService,
        { provide: OnlinePlayersService, useClass: OnlinePlayersServiceStub },
        PlayersService,
        Events,
      ],
    }).compile();

    service = module.get<PlayerBansService>(PlayerBansService);
    playerBanModel = module.get(getModelToken(PlayerBan.name));
    onlinePlayersService = module.get(OnlinePlayersService);
    playersService = module.get(PlayersService);
    events = module.get(Events);
    connection = module.get(getConnectionToken());
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

  afterEach(async () => {
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#getById()', () => {
    it('should return the ban by its id', async () => {
      const ret = await service.getById(mockPlayerBan._id);
      expect(ret._id).toEqual(mockPlayerBan._id);
      expect(ret.player).toEqual(player._id);
    });

    describe('when the given ban does not exist', () => {
      it('should throw', async () => {
        await expect(
          service.getById(new Types.ObjectId() as PlayerBanId),
        ).rejects.toThrow(Error.DocumentNotFoundError);
      });
    });
  });

  describe('#getPlayerBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerBans(player._id);
      expect(ret.length).toEqual(1);
      expect(ret[0]._id).toEqual(mockPlayerBan._id);
    });
  });

  describe('#getPlayerActiveBans()', () => {
    it('should query model', async () => {
      const ret = await service.getPlayerActiveBans(player._id);
      expect(ret.length).toEqual(1);
      expect(ret[0]._id).toEqual(mockPlayerBan._id);
    });
  });

  describe('#addPlayerBan()', () => {
    describe('when adding a valid ban', () => {
      let newBan: Omit<PlayerBan, 'id' | '_id' | 'serialize'>;

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
        expect(ret.player.toString()).toEqual(player.id);
        expect(ret.admin.toString()).toEqual(admin.id);
      });

      it('should emit the playerBanAdded event', () =>
        new Promise<void>((resolve) => {
          events.playerBanAdded.subscribe(({ ban }) => {
            expect(ban.player.toString()).toEqual(player.id.toString());
            resolve();
          });

          service.addPlayerBan(newBan);
        }));

      it("should emit profile update event on player's socket", () =>
        new Promise<void>((resolve) => {
          const socket = {
            emit: (eventName: string, update: any) => {
              expect(eventName).toEqual('profile update');
              expect(update.bans.length).toEqual(2);
              resolve();
            },
          };

          onlinePlayersService.getSocketsForPlayer = jest
            .fn()
            .mockReturnValue([socket]);
          service.addPlayerBan(newBan);
        }));
    });

    describe('when adding a ban that has invalid player id', () => {
      let invalidBan: PlayerBan;

      beforeEach(() => {
        const end = new Date();
        end.setHours(end.getHours() + 1);

        invalidBan = {
          _id: new Types.ObjectId() as PlayerBanId,
          id: 'FAKE_ID',
          player: new Types.ObjectId() as PlayerId,
          admin: admin._id,
          start: new Date(),
          end,
          reason: 'just testing',
          serialize: jest.fn(),
        };
      });

      it('should throw an error', async () => {
        await expect(service.addPlayerBan(invalidBan)).rejects.toThrow();
      });
    });
  });

  describe('#revokeBan()', () => {
    it('should revoke the ban', async () => {
      const ban = await service.revokeBan(mockPlayerBan._id, admin._id);
      expect(ban.end.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });

    it('should emit the playerBanRevoked event', () =>
      new Promise<void>((resolve) => {
        events.playerBanRevoked.subscribe(({ ban, adminId }) => {
          expect(adminId?.equals(admin.id)).toBe(true);
          expect(ban.player.toString()).toEqual(player.id.toString());
          resolve();
        });

        service.revokeBan(mockPlayerBan._id, admin._id);
      }));

    describe('when attempting to revoke an already expired ban', () => {
      beforeEach(async () => {
        await service.revokeBan(mockPlayerBan._id, admin._id);
      });

      it('should reject', async () => {
        await expect(
          service.revokeBan(mockPlayerBan._id, admin._id),
        ).rejects.toThrow();
      });
    });
  });
});
