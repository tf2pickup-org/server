import { Events } from '@/events/events';
import { Game, GameDocument, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
import { PlayerSubstitutionService } from '@/games/services/player-substitution.service';
import { Player, PlayerDocument, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { getConnectionToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { PlayerBehaviorHandlerService } from './player-behavior-handler.service';
// eslint-disable-next-line jest/no-mocks-import
import { PlayersService as MockedPlayersService } from '@/players/services/__mocks__/players.service';
// eslint-disable-next-line jest/no-mocks-import
import { GamesService as MockedGamesService } from '@/games/services/__mocks__/games.service';
import { PlayerConnectionStatus } from '@/games/models/player-connection-status';
import { SlotStatus } from '@/games/models/slot-status';
import { sub } from 'date-fns';
import { GameEventType } from '@/games/models/game-event';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { ConfigurationEntryKey } from '@/configuration/models/configuration-entry-key';

jest.mock('@/games/services/games.service');
jest.mock('@/players/services/players.service');
jest.mock('@/games/services/player-substitution.service');
jest.mock('@/configuration/services/configuration.service');

describe('PlayerBehaviorHandlerService', () => {
  let service: PlayerBehaviorHandlerService;
  let mongod: MongoMemoryServer;
  let playersService: MockedPlayersService;
  let gamesService: MockedGamesService;
  let connection: Connection;
  let bot: PlayerDocument;
  let playerSubstitutionService: jest.Mocked<PlayerSubstitutionService>;
  let configurationService: jest.Mocked<ConfigurationService>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          { name: Player.name, schema: playerSchema },
        ]),
      ],
      providers: [
        PlayerBehaviorHandlerService,
        GamesService,
        PlayersService,
        PlayerSubstitutionService,
        Events,
        ConfigurationService,
      ],
    }).compile();

    service = module.get<PlayerBehaviorHandlerService>(
      PlayerBehaviorHandlerService,
    );
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    connection = module.get(getConnectionToken());
    playerSubstitutionService = module.get(PlayerSubstitutionService);
    configurationService = module.get(ConfigurationService);
  });

  beforeEach(async () => {
    bot = await playersService._createOne();
    playersService.findBot.mockResolvedValue(bot);
    configurationService.getTimeToJoinGameServer.mockResolvedValue({
      key: ConfigurationEntryKey.timeToJoinGameServer,
      value: 60 * 1000,
    });
  });

  afterEach(async () => {
    await playersService._reset();
    await gamesService._reset();
  });

  afterEach(async () => await connection.close());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#verifyPlayersJoinedGameServer()', () => {
    let game: GameDocument;
    let player1: PlayerDocument, player2: PlayerDocument;

    describe('when a game has not yet started', () => {
      beforeEach(async () => {
        player1 = await playersService._createOne();
        player2 = await playersService._createOne();
        game = await gamesService._createOne([player1, player2]);
        game.slots.find((s) => s.player === player1._id).connectionStatus =
          PlayerConnectionStatus.connected;
        game.events[0].at = sub(new Date(), { minutes: 3 });
        game.events.push({
          at: sub(new Date(), { minutes: 2 }),
          event: GameEventType.GameServerInitialized,
        });
        await game.save();
      });

      it('should automatically substitute all the offline players', async () => {
        await service.verifyPlayersJoinedGameServer();
        expect(playerSubstitutionService.substitutePlayer).toHaveBeenCalledWith(
          game.id,
          player2.id,
          bot.id,
        );
      });
    });
  });
});
