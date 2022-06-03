import { setApp } from '@/app';
import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { isNumber } from 'lodash';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { players } from './test-data';
import { waitABit } from './utils/wait-a-bit';

const connectSocket = (port: number, token: string) =>
  new Promise<Socket>((resolve, reject) => {
    const socket = io(`http://localhost:${port}`, {
      auth: { token: `Bearer ${token}` },
    });
    socket.on('connect_error', (error) => reject(error));
    socket.on('connect', () => {
      resolve(socket);
    });
  });

interface Client {
  playerId: string;
  socket: Socket;
}

describe('Launch game (e2e)', () => {
  let app: INestApplication;
  let clients: Client[];

  // players[0] is the super-user
  let authToken: string;
  let newGameId: string;
  let activeGameId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setApp(app);
    await app.listen(3000);

    clients = [];
    const playersService = app.get(PlayersService);
    const authService = app.get(AuthService);

    for (let i = 0; i < 12; ++i) {
      const playerId = (await playersService.findBySteamId(players[i])).id;

      const token = await authService.generateJwtToken(
        JwtTokenPurpose.websocket,
        playerId,
      );

      const socket = await connectSocket(
        app.getHttpServer().address().port,
        token,
      );
      clients.push({ playerId, socket });
    }

    authToken = await authService.generateJwtToken(
      JwtTokenPurpose.auth,
      clients[0].playerId,
    );
  });

  beforeAll(() => {
    clients[0].socket.on('game created', (game) => {
      newGameId = game.id;
    });

    clients[0].socket.on('profile update', (profile) => {
      activeGameId = profile.activeGameId;
    });
  });

  afterAll(async () => {
    clients.forEach((player) => player.socket.disconnect());
    clients = [];

    await waitABit(1000);
    await app.close();
  });

  it('should launch the game when 12 players join the game and ready up', async () => {
    // all 12 players join the queue
    let lastSlotId = 0;
    for (let i = 0; i < 12; ++i) {
      clients[i].socket.emit('join queue', { slotId: lastSlotId++ });
      await waitABit(150);
    }

    await waitABit(100);
    await request(app.getHttpServer())
      .get('/queue')
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('ready');
        expect(body.slots.every((slot) => slot.player !== null)).toBe(true);
        expect(
          clients
            .map((p) => p.playerId)
            .every((playerId) =>
              body.slots.find((s) => s.player.id === playerId),
            ),
        ).toBe(true);
      });

    // queue is in ready state
    // all 12 players ready up
    for (let i = 0; i < 12; ++i) {
      clients[i].socket.emit('player ready');
      await waitABit(150);
    }

    await waitABit(500);
    await request(app.getHttpServer())
      .get('/queue')
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('waiting');
        expect(body.slots.every((slot) => slot.player === undefined)).toBe(
          true,
        );
      });

    // the new game should be announced to all clients
    expect(newGameId).toBeTruthy();
    // the new game should be assigned to all players
    expect(activeGameId).toEqual(newGameId);

    await request(app.getHttpServer())
      .get(`/games/${newGameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('launching');
        expect(
          clients
            .map((p) => p.playerId)
            .every((playerId) =>
              body.slots.find((s) => s.player.id === playerId),
            ),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/games/${newGameId}/skills`)
      .auth(authToken, { type: 'bearer' })
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(
          clients
            .map((p) => p.playerId)
            .every((playerId) => isNumber(body[playerId])),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .get(`/games/${newGameId}/connect-info`)
      .expect(401);

    await request(app.getHttpServer())
      .get(`/games/${newGameId}/connect-info`)
      .auth(authToken, { type: 'bearer' })
      .expect(200);

    // kill the game
    await waitABit(500);
    await request(app.getHttpServer())
      .post(`/games/${newGameId}?force_end`)
      .auth(authToken, { type: 'bearer' })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/games/${newGameId}`)
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('interrupted');
      });

    // all players should be freed
    expect(activeGameId).toBe(null);
  });
});
