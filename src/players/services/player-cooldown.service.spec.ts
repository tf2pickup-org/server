import { ConfigurationService } from '@/configuration/services/configuration.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { milliseconds } from 'date-fns';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { Player, PlayerDocument, playerSchema } from '../models/player';
import { PlayerBansService } from './player-bans.service';
import { PlayerCooldownService } from './player-cooldown.service';
import { PlayersService } from './players.service';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as MockPlayersService } from './__mocks__/players.service';

jest.mock('@/configuration/services/configuration.service');
jest.mock('./players.service');
jest.mock('./player-bans.service');

describe('PlayerCooldownService', () => {
  let service: PlayerCooldownService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let playersService: MockPlayersService;
  let configurationService: jest.Mocked<ConfigurationService>;
  let playerBansService: jest.Mocked<PlayerBansService>;
  let configuration: Record<string, unknown>;
  let bot: Player;

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
        ]),
      ],
      providers: [
        PlayerCooldownService,
        PlayersService,
        ConfigurationService,
        PlayerBansService,
      ],
    }).compile();

    service = module.get<PlayerCooldownService>(PlayerCooldownService);
    connection = module.get(getConnectionToken());
    playersService = module.get(PlayersService);
    configurationService = module.get(ConfigurationService);
    playerBansService = module.get(PlayerBansService);
  });

  beforeEach(async () => {
    bot = await playersService._createOne();
    playersService.findBot.mockResolvedValue(bot);
  });

  beforeEach(() => {
    configuration = {
      'games.cooldown_levels': [
        {
          level: 0,
          banLengthMs: milliseconds({ hours: 1 }),
        },
      ],
    };
    configurationService.get.mockImplementation((key: string) =>
      Promise.resolve(configuration[key]),
    );
  });

  afterEach(async () => {
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#applyCooldown()', () => {
    let player: PlayerDocument;

    beforeEach(async () => {
      player = await playersService._createOne();
    });

    it('should increase cooldown', async () => {
      expect(player.cooldownLevel).toBe(0);
      await service.applyCooldown(player._id);
      const updatedPlayer = await playersService.getById(player._id);
      expect(updatedPlayer.cooldownLevel).toBe(1);
    });

    it('should apply ban', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2023-02-14T02:00:00.000Z'));
      await service.applyCooldown(player._id);
      expect(playerBansService.addPlayerBan).toHaveBeenCalledWith({
        player: player._id,
        admin: bot._id,
        start: new Date('2023-02-14T02:00:00.000Z'),
        end: new Date('2023-02-14T03:00:00.000Z'),
        reason: 'Cooldown level 0',
      });
      jest.useRealTimers();
    });

    describe('when the cooldown is disabled', () => {
      beforeEach(() => {
        configuration['games.cooldown_levels'] = [];
      });

      it('should not apply ban', async () => {
        await service.applyCooldown(player._id);
        expect(playerBansService.addPlayerBan).not.toHaveBeenCalled();
      });
    });

    describe('when increasing cooldown beyond the configured limit', () => {
      beforeEach(async () => {
        await service.applyCooldown(player._id);
      });

      it('should apply ban', async () => {
        jest
          .useFakeTimers()
          .setSystemTime(new Date('2023-02-14T11:00:00.000Z'));
        await service.applyCooldown(player._id);
        expect(playerBansService.addPlayerBan).toHaveBeenCalledWith({
          player: player._id,
          admin: bot._id,
          start: new Date('2023-02-14T11:00:00.000Z'),
          end: new Date('2023-02-14T12:00:00.000Z'),
          reason: 'Cooldown level 1',
        });
        jest.useRealTimers();
        const updatedPlayer = await playersService.getById(player._id);
        expect(updatedPlayer.cooldownLevel).toBe(2);
      });
    });
  });
});
