import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { configureApplication } from '@/configure-application';
import { Events } from '@/events/events';
import { GameId } from '@/games/game-id';
import { GamesService } from '@/games/services/games.service';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { players } from './test-data';
import { waitABit } from './utils/wait-a-bit';
import { waitForTheGameToLaunch } from './utils/wait-for-the-game-to-launch';

describe('Launch game (e2e)', () => {
  let app: INestApplication;
  let playersService: PlayersService;
  let gameId: GameId;
  let events: Events;
  let playerSocket: Socket;
  let substituteRequests: any[];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.listen(3000);

    playersService = app.get(PlayersService);
    events = app.get(Events);

    const authService = app.get(AuthService);

    const playerToken = await authService.generateJwtToken(
      JwtTokenPurpose.websocket,
      (
        await playersService.findBySteamId(players[1])
      ).id,
    );

    playerSocket = io(
      `http://localhost:${app.getHttpServer().address().port}`,
      {
        auth: { token: `Bearer ${playerToken}` },
      },
    );

    substituteRequests = [];
    playerSocket.on(
      'substitute requests update',
      (requests) => (substituteRequests = requests),
    );
  });

  beforeAll(async () => {
    const configurationService = app.get(ConfigurationService);
    await configurationService.set(
      'games.rejoin_gameserver_timeout',
      90 * 1000,
    );
  });

  beforeAll(async () => {
    const gamesService = app.get(GamesService);
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
    await waitForTheGameToLaunch(app, gameId);

    for (const slot of game.slots) {
      const player = await playersService.getById(slot.player);
      events.playerJoinedGameServer.next({
        gameId,
        steamId: player.steamId,
        ipAddress: '127.0.0.1',
      });
      await waitABit(100);
      events.playerJoinedTeam.next({
        gameId,
        steamId: player.steamId,
      });
      await waitABit(100);
    }

    events.matchStarted.next({ gameId });
  });

  afterAll(async () => {
    await waitABit(1000);

    const gamesService = app.get(GamesService);
    await gamesService.forceEnd(gameId);

    await waitABit(1000);
    await app.close();
  });

  it('should substitute a player that disconnects from the game', async () => {
    expect(substituteRequests.length).toEqual(0);
    const player = await playersService.findBySteamId(players[1]);
    await waitABit(30 * 1000);

    events.playerDisconnectedFromGameServer.next({
      gameId,
      steamId: player.steamId,
    });

    await waitABit(60 * 1000);
    expect(substituteRequests.length).toEqual(0);

    await waitABit(60 * 1000);
    expect(substituteRequests.length).toEqual(1);
  });
});
