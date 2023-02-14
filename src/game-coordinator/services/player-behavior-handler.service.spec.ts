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
import { GameState } from '@/games/models/game-state';
import { PlayerCooldownService } from '@/players/services/player-cooldown.service';

jest.mock('@/games/services/games.service');
jest.mock('@/players/services/players.service');
jest.mock('@/games/services/player-substitution.service');
jest.mock('@/configuration/services/configuration.service');
jest.mock('@/players/services/player-cooldown.service');

describe('PlayerBehaviorHandlerService', () => {
  let service: PlayerBehaviorHandlerService;
  let mongod: MongoMemoryServer;
  let playersService: MockedPlayersService;
  let gamesService: MockedGamesService;
  let connection: Connection;
  let bot: PlayerDocument;
  let playerSubstitutionService: jest.Mocked<PlayerSubstitutionService>;

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
        PlayerCooldownService,
      ],
    }).compile();

    service = module.get<PlayerBehaviorHandlerService>(
      PlayerBehaviorHandlerService,
    );
    playersService = module.get(PlayersService);
    gamesService = module.get(GamesService);
    connection = module.get(getConnectionToken());
    playerSubstitutionService = module.get(PlayerSubstitutionService);
  });

  beforeEach(async () => {
    bot = await playersService._createOne();
    playersService.findBot.mockResolvedValue(bot);
  });

  afterEach(async () => {
    await playersService._reset();
    await gamesService._reset();
  });

  afterEach(async () => await connection.close());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('#autoSubstitutePlayers()', () => {
    let game: GameDocument;
    let player: PlayerDocument;

    beforeEach(async () => {
      player = await playersService._createOne();
      game = await gamesService._createOne([player]);

      game.state = GameState.started;
      await game.save();
    });

    describe('when the timeout is undefined', () => {
      beforeEach(() => {
        gamesService.calculatePlayerJoinGameServerTimeout.mockResolvedValue(
          undefined,
        );
      });

      it('should not sub the player', async () => {
        await service.autoSubstitutePlayers();
        expect(
          playerSubstitutionService.substitutePlayer,
        ).not.toHaveBeenCalled();
      });
    });
  });
});
