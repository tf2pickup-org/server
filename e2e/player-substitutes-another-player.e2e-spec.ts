import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { GameRuntimeService } from '@/games/services/game-runtime.service';
import { GamesService } from '@/games/services/games.service';
import { PlayersService } from '@/players/services/players.service';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { players } from './test-data';
import { waitABit } from './utils/wait-a-bit';

describe('Player substitutes another player (e2e)', () => {
  let app: INestApplication;
  let playersService: PlayersService;
  let adminToken: string;
  let gameId: string;
  let playerSocket: Socket;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);

    playersService = app.get(PlayersService);
    const authService = app.get(AuthService);
    adminToken = await authService.generateJwtToken(
      JwtTokenPurpose.auth,
      (
        await playersService.findBySteamId(players[0])
      ).id,
    );

    const playerToken = await authService.generateJwtToken(
      JwtTokenPurpose.websocket,
      (
        await playersService.findBySteamId(players[12])
      ).id,
    );

    playerSocket = io(
      `http://localhost:${app.getHttpServer().address().port}`,
      {
        auth: { token: `Bearer ${playerToken}` },
      },
    );
  });

  beforeAll(async () => {
    const gamesService = app.get(GamesService);
    const game = await gamesService.create(
      [
        {
          id: 0,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[0])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 1,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[1])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 2,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[2])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 3,
          gameClass: Tf2ClassName.scout,
          playerId: (await playersService.findBySteamId(players[3])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 4,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[4])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 5,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[5])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 6,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[6])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 7,
          gameClass: Tf2ClassName.soldier,
          playerId: (await playersService.findBySteamId(players[7])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 8,
          gameClass: Tf2ClassName.demoman,
          playerId: (await playersService.findBySteamId(players[8])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 9,
          gameClass: Tf2ClassName.demoman,
          playerId: (await playersService.findBySteamId(players[9])).id,
          ready: true,
          canMakeFriends: false,
        },
        {
          id: 10,
          gameClass: Tf2ClassName.medic,
          playerId: (await playersService.findBySteamId(players[10])).id,
          ready: true,
          canMakeFriends: true,
        },
        {
          id: 11,
          gameClass: Tf2ClassName.medic,
          playerId: (await playersService.findBySteamId(players[11])).id,
          ready: true,
          canMakeFriends: true,
        },
      ],
      'cp_badlands',
    );
    gameId = game.id;
  });

  afterAll(async () => {
    await waitABit(1000);

    const gameRuntimeService = app.get(GameRuntimeService);
    await gameRuntimeService.forceEnd(gameId);

    playerSocket.disconnect();
    playerSocket = undefined;

    await waitABit(1000);
    await app.close();
  });

  it('should substitute a player', async () => {
    const replacee = await playersService.findBySteamId(players[1]);
    const replacement = await playersService.findBySteamId(players[12]);

    // admin requests substitute
    await request(app.getHttpServer())
      .post(`/games/${gameId}?substitute_player=${replacee.id}`)
      .auth(adminToken, { type: 'bearer' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/games/${gameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        const slot = body.slots.find((s) => s.player === replacee.id);
        expect(slot.status).toEqual('waiting for substitute');
      });

    // player takes the substitute spot
    await new Promise<void>((resolve) => {
      playerSocket.emit(
        'replace player',
        { gameId, replaceeId: replacee.id },
        () => {
          resolve();
        },
      );
    });

    await request(app.getHttpServer())
      .get(`/games/${gameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.slots.find((s) => s.player === replacement.id).status).toBe(
          'active',
        );
        expect(body.slots.find((s) => s.player === replacee.id).status).toBe(
          'replaced',
        );
      });
  });
});
