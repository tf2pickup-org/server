import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { players } from './test-data';

jest.mock('@/players/services/steam-api.service');

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

const waitABit = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

interface Client {
  playerId: string;
  socket: Socket;
}

describe('Launch game (e2e)', () => {
  let app: INestApplication;
  let clients: Client[];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);

    const configurationService = app.get(ConfigurationService);
    await configurationService.setEtf2lAccountRequired(false);

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
  });

  afterAll(async () => {
    clients.forEach((player) => player.socket.disconnect());
    clients = [];

    await waitABit(1000);
    await app.close();
  });

  it('should launch the game when 12 players join the game and ready up', async () => {
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
              body.slots.find((s) => s.playerId === playerId),
            ),
        ).toBe(true);
      });

    let newGameId: string;
    clients[0].socket.on('game created', (game) => {
      newGameId = game.id;
    });

    let activeGameId: string;
    clients[0].socket.on('profile update', (profile) => {
      activeGameId = profile.activeGameId;
    });

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
        expect(body.slots.every((slot) => slot.player === null)).toBe(true);
      });

    expect(newGameId).toBeDefined();
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
            .every((playerId) => body.slots.find((s) => s.player === playerId)),
        ).toBe(true);
      });
  });
});
