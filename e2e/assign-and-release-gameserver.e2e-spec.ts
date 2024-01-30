import { AppModule } from '@/app.module';
import { GamesService } from '@/games/services/games.service';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { players } from './test-data';
import { waitABit } from './utils/wait-a-bit';
import * as request from 'supertest';
import { StaticGameServersService } from '@/game-servers/providers/static-game-server/services/static-game-servers.service';
import { configureApplication } from '@/configure-application';
import { Events } from '@/events/events';
import { waitForTheGameToLaunch } from './utils/wait-for-the-game-to-launch';
import { GameServer } from '@/games/models/game-server';
import { GameId } from '@/games/types/game-id';

jest.setTimeout(250 * 1000);

describe('Assign and release gameserver (e2e)', () => {
  let app: INestApplication;
  let gameId: GameId;
  let staticGameServersService: StaticGameServersService;

  const waitForGameServerToComeOnline = () =>
    new Promise<string>((resolve) => {
      const i = setInterval(async () => {
        const gameServers = await staticGameServersService.getFreeGameServers();
        if (gameServers.length > 0) {
          clearInterval(i);
          resolve(gameServers[0].id);
        }
      }, 1000);
    });

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.listen(3000);

    staticGameServersService = app.get(StaticGameServersService);
    await waitForGameServerToComeOnline();
  });

  beforeAll(async () => {
    const gamesService = app.get(GamesService);
    const playersService = app.get(PlayersService);
    const game = await gamesService.create(
      [
        {
          id: 0,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[0]))._id,
          ready: true,
        },
        {
          id: 1,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[1]))._id,
          ready: true,
        },
        {
          id: 2,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[2]))._id,
          ready: true,
        },
        {
          id: 3,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[3]))._id,
          ready: true,
        },
        {
          id: 4,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[4]))._id,
          ready: true,
        },
        {
          id: 5,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[5]))._id,
          ready: true,
        },
        {
          id: 6,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[6]))._id,
          ready: true,
        },
        {
          id: 7,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[7]))._id,
          ready: true,
        },
        {
          id: 8,
          gameClass: Tf2ClassName.demoman,
          playerId: (await playersService.findBySteamId(players[8]))._id,
          ready: true,
        },
        {
          id: 9,
          gameClass: Tf2ClassName.demoman,
          playerId: (await playersService.findBySteamId(players[9]))._id,
          ready: true,
        },
        {
          id: 10,
          gameClass: Tf2ClassName.medic,
          playerId: (await playersService.findBySteamId(players[10]))._id,
          ready: true,
          canMakeFriendsWith: [
            Tf2ClassName.scout,
            Tf2ClassName.soldier,
            Tf2ClassName.demoman,
          ],
        },
        {
          id: 11,
          gameClass: Tf2ClassName.medic,
          playerId: (await playersService.findBySteamId(players[11]))._id,
          ready: true,
          canMakeFriendsWith: [
            Tf2ClassName.scout,
            Tf2ClassName.soldier,
            Tf2ClassName.demoman,
          ],
        },
      ],
      'cp_badlands',
    );
    gameId = game._id;
    await waitABit(1000);
    await waitForTheGameToLaunch(app, gameId.toString());
  });

  afterAll(async () => {
    await waitABit(40 * 1000); // wait for the gameserver to cleanup
    await app.close();
  });

  it('should assign and release a gameserver', async () => {
    /* verify the gameserver is assigned */
    await request(app.getHttpServer())
      .get(`/games/${gameId.toString()}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.gameServer).toBeTruthy();
      });

    const gamesService = app.get(GamesService);
    const game = await gamesService.getById(gameId);
    expect(game.gameServer).toBeTruthy();
    const gameServerId = (game.gameServer as GameServer).id;

    await request(app.getHttpServer())
      .get(`/static-game-servers/${gameServerId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.game).toEqual(gameId.toString());
        expect(body.isOnline).toBe(true);
      });

    /* pretend the game has started */
    const events = app.get(Events);
    events.matchStarted.next({ gameId });
    await waitABit(1000);

    /* pretend the game has ended */
    events.matchEnded.next({ gameId });
    await waitABit(1000);

    /* verify the game is marked as ended */
    await request(app.getHttpServer())
      .get(`/games/${gameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('ended');
      });

    /* and now verify the gameserver is released */
    await waitABit(121 * 1000);
    await request(app.getHttpServer())
      .get(`/static-game-servers/${gameServerId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.game).toBeUndefined();
      });
  });
});
