import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { ConfigurationService } from '@/configuration/services/configuration.service';
import { Game } from '@/games/models/game';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';

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

interface PlayerPerspective {
  playerId: string;
  socket: Socket;
}

describe('Launch game (e2e)', () => {
  let app: INestApplication;
  let players: PlayerPerspective[];

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);

    const configurationService = app.get(ConfigurationService);
    await configurationService.setEtf2lAccountRequired(false);

    players = [];
    const playersService = app.get(PlayersService);
    const authService = app.get(AuthService);

    const fakeAccounts = (await import('./steam-profiles')).fakeAccounts;
    for (let i = 0; i < 12; ++i) {
      const playerId = (await playersService.createPlayer(fakeAccounts[i])).id;
      await playersService.updatePlayer(playerId, {
        hasAcceptedRules: true,
      });

      const token = await authService.generateJwtToken(
        JwtTokenPurpose.websocket,
        playerId,
      );

      const socket = await connectSocket(
        app.getHttpServer().address().port,
        token,
      );
      players.push({ playerId, socket });
    }
  });

  afterAll(async () => {
    players.forEach((player) => player.socket.disconnect());
    players = [];

    await waitABit(1000);

    const playerModel = app.get(getModelToken(Player.name));
    await playerModel.deleteMany({});

    const gameModel = app.get(getModelToken(Game.name));
    await gameModel.deleteMany({});

    await app.close();
  });

  it('should launch the game when 12 players join the game and ready up', async () => {
    let lastSlotId = 0;
    players.forEach((player) => {
      player.socket.emit('join queue', { slotId: lastSlotId++ });
    });

    await waitABit(100);
    await request(app.getHttpServer())
      .get('/queue')
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('ready');
        expect(body.slots.every((slot) => slot.player !== null)).toBe(true);
      });

    players.forEach((player) => {
      player.socket.emit('player ready');
    });

    await waitABit(1000);
    await request(app.getHttpServer())
      .get('/queue')
      .expect(200)
      .then((response) => {
        const body = response.body;
        expect(body.state).toEqual('waiting');
        expect(body.slots.every((slot) => slot.player === null)).toBe(true);
      });
  });
});
