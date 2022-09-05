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
import { GameLauncherService } from '@/game-coordinator/services/game-launcher.service';
import { GameEventHandlerService } from '@/games/services/game-event-handler.service';
import { configureApplication } from '@/configure-application';

jest.setTimeout(150 * 1000);

describe('Assign and release gameserver (e2e)', () => {
  let app: INestApplication;
  let gameId: string;
  let staticGameServersService: StaticGameServersService;
  let gameServer: string;

  const waitForGameServerToComeOnline = () =>
    new Promise<string>((resolve) => {
      const i = setInterval(async () => {
        const gameServers = await staticGameServersService.getAllGameServers();
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
    gameServer = await waitForGameServerToComeOnline();
  });

  beforeAll(async () => {
    const gamesService = app.get(GamesService);
    const playersService = app.get(PlayersService);
    const game = await gamesService.create(
      [
        {
          id: 0,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[0])).id,
          ready: true,
        },
        {
          id: 1,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[1])).id,
          ready: true,
        },
        {
          id: 2,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[2])).id,
          ready: true,
        },
        {
          id: 3,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[3])).id,
          ready: true,
        },
        {
          id: 4,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[4])).id,
          ready: true,
        },
        {
          id: 5,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[5])).id,
          ready: true,
        },
        {
          id: 6,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[6])).id,
          ready: true,
        },
        {
          id: 7,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[7])).id,
          ready: true,
        },
        {
          id: 8,
          gameClass: Tf2ClassName.demoman,
          playerId: (await playersService.findBySteamId(players[8])).id,
          ready: true,
        },
        {
          id: 9,
          gameClass: Tf2ClassName.demoman,
          playerId: (await playersService.findBySteamId(players[9])).id,
          ready: true,
        },
        {
          id: 10,
          gameClass: Tf2ClassName.medic,
          playerId: (await playersService.findBySteamId(players[10])).id,
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
          playerId: (await playersService.findBySteamId(players[11])).id,
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
    gameId = game.id;
    const gameLauncherService = app.get(GameLauncherService);
    await gameLauncherService.launchOrphanedGames();
  });

  afterAll(async () => {
    await waitABit(1000);
    await app.close();
  });

  it('should assign and release a gameserver', async () => {
    /* verify the gameserver is assigned */
    await request(app.getHttpServer())
      .get(`/games/${gameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.gameServer).toBeTruthy();
        expect(body.gameServer.name).toEqual('A Team Fortress 2 server');
      });

    await request(app.getHttpServer())
      .get(`/static-game-servers/${gameServer}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.game).toEqual(gameId);
        expect(body.isClean).toBe(false);
        expect(body.isOnline).toBe(true);
      });

    /* pretend the game has started */
    const gameEventHandlerService = app.get(GameEventHandlerService);
    await gameEventHandlerService.onMatchStarted(gameId);
    await waitABit(1000);

    /* pretend the game has ended */
    await gameEventHandlerService.onMatchEnded(gameId);

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
      .get(`/static-game-servers/${gameServer}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.game).toBe(undefined);
      });
  });
});
