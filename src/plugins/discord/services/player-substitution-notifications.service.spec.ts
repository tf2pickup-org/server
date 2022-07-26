import { Environment } from '@/environment/environment';
import { Events } from '@/events/events';
import { Game, gameSchema } from '@/games/models/game';
import { GamesService } from '@/games/services/games.service';
import { Player, playerSchema } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { mongooseTestingModule } from '@/utils/testing-mongoose-module';
import { CacheModule } from '@nestjs/common';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { DiscordService } from './discord.service';
import { PlayerSubstitutionNotificationsService } from './player-substitution-notifications.service';
// eslint-disable-next-line jest/no-mocks-import
import { DiscordService as DiscordServiceMock } from './__mocks__/discord.service';

jest.mock('./discord.service');
jest.mock('@/environment/environment');
jest.mock('@/games/services/games.service');
jest.mock('@/players/services/players.service');

describe('PlayerSubstitutionNotificationsService', () => {
  let service: PlayerSubstitutionNotificationsService;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let gamesService: GamesService;
  let events: Events;
  let discordService: DiscordServiceMock;
  let playersService: PlayersService;
  let environment: jest.Mocked<Environment>;

  beforeAll(async () => (mongod = await MongoMemoryServer.create()));
  afterAll(async () => await mongod.stop());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        mongooseTestingModule(mongod),
        MongooseModule.forFeature([
          { name: Game.name, schema: gameSchema },
          {
            name: Player.name,
            schema: playerSchema,
          },
        ]),
        CacheModule.register(),
      ],
      providers: [
        PlayerSubstitutionNotificationsService,
        Events,
        DiscordService,
        Environment,
        GamesService,
        PlayersService,
      ],
    }).compile();

    service = module.get<PlayerSubstitutionNotificationsService>(
      PlayerSubstitutionNotificationsService,
    );
    connection = module.get(getConnectionToken());
    gamesService = module.get(GamesService);
    events = module.get(Events);
    discordService = module.get(DiscordService);
    playersService = module.get(PlayersService);
    environment = module.get(Environment);
  });

  beforeEach(() => service.onModuleInit());

  afterEach(async () => {
    // @ts-expect-error
    await gamesService._reset();
    // @ts-expect-error
    await playersService._reset();
    await connection.close();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('when substituteRequested event is emitted', () => {
    let game: Game;
    let player: Player;

    beforeEach(async () => {
      // @ts-expect-error
      player = await playersService._createOne();
      // @ts-expect-error
      game = await gamesService._createOne([player]);

      (environment.discordQueueNotificationsMentionRole as string) =
        'TF2 gamers';
    });

    it('should notify all players', async () =>
      new Promise<void>((resolve) => {
        const channel = discordService.getPlayersChannel();
        channel.send.mockImplementation(() => {
          expect(channel.send).toHaveBeenCalledWith({
            content: '&<TF2 gamers>',
            embeds: [expect.any(Object)],
          });
          setImmediate(() => resolve());
          return {
            id: 'FAKE_MESSAGE_ID',
          };
        });

        events.substituteRequested.next({
          gameId: game.id,
          playerId: player.id,
        });
      }));
  });
});
