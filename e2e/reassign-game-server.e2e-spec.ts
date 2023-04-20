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
import { AuthService } from '@/auth/services/auth.service';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { waitForTheGameToLaunch } from './utils/wait-for-the-game-to-launch';
import { GameId } from '@/games/game-id';

jest.setTimeout(250 * 1000);

describe('Reassign gameserver (e2e)', () => {
  let app: INestApplication;
  let gameId: GameId;
  let staticGameServersService: StaticGameServersService;
  let adminAuthToken: string;

  const waitForAllGameServersToComeOnline = () =>
    new Promise<void>((resolve) => {
      const i = setInterval(async () => {
        const gameServers = await staticGameServersService.getFreeGameServers();
        if (gameServers.length >= 2) {
          clearInterval(i);
          resolve();
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
    await waitForAllGameServersToComeOnline();
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

    const player = await playersService.findBySteamId(players[0]);
    const authService = app.get(AuthService);
    adminAuthToken = await authService.generateJwtToken(
      JwtTokenPurpose.auth,
      player.id,
    );

    await waitABit(1000);
  });

  afterAll(async () => {
    await waitABit(1000);
    await app.close();
  });

  it('should reassign gameserver', async () => {
    /* verify the gameserver is assigned */
    await request(app.getHttpServer())
      .get(`/games/${gameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.gameServer).toBeTruthy();
      });

    await waitForTheGameToLaunch(app, gameId.toString());

    let gameServerName: string;

    /* verify /game-servers/options endpoint is protected */
    await request(app.getHttpServer()).get('/game-servers/options').expect(401);

    /* fetch gameserver options */
    await request(app.getHttpServer())
      .get('/game-servers/options')
      .set('Cookie', [`auth_token=${adminAuthToken}`])
      .expect(200)
      .then(async (response) => {
        const body = response.body;
        expect(body.length > 0).toBe(true);
        const gameServer = body[0];
        gameServerName = gameServer.name;

        await request(app.getHttpServer())
          .put(`/games/${gameId}/assign-gameserver`)
          .send({
            id: gameServer.id,
            provider: gameServer.provider,
          })
          .expect(401);

        await request(app.getHttpServer())
          .put(`/games/${gameId}/assign-gameserver`)
          .set('Cookie', [`auth_token=${adminAuthToken}`])
          .send({
            id: gameServer.id,
          })
          .expect(400);

        // reassign gameserver
        await request(app.getHttpServer())
          .put(`/games/${gameId}/assign-gameserver`)
          .set('Cookie', [`auth_token=${adminAuthToken}`])
          .send({
            id: gameServer.id,
            provider: gameServer.provider,
          })
          .expect(200);

        await waitABit(100);

        await request(app.getHttpServer())
          .get(`/games/${gameId}`)
          .then((response) => {
            const body = response.body;
            expect(body.stvConnectString).toBe(undefined);
          });
      });

    /* verify the gameserver is assigned */
    await request(app.getHttpServer())
      .get(`/games/${gameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.gameServer).toBeTruthy();
        expect(body.gameServer.name).toEqual(gameServerName);
      });

    await waitForTheGameToLaunch(app, gameId.toString());

    const gamesService = app.get(GamesService);
    await gamesService.forceEnd(gameId);
  });
});
