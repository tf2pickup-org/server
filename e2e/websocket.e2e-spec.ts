import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';

jest.mock('@/players/services/steam-api.service');

describe('Websocket (e2e)', () => {
  let app: INestApplication;
  let maly: Player;
  let socket: Socket;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);
  });

  beforeAll(async () => {
    const playersService = app.get(PlayersService);
    maly = await playersService.createPlayer(
      (
        await import('./steam-profiles')
      ).maly,
    );
  });

  afterAll(async () => {
    const playerModel = app.get(getModelToken(Player.name));
    await playerModel.deleteMany({});
    await app.close();
  });

  afterEach(() => {
    socket.disconnect();
    socket = undefined;
  });

  describe('when the user is not authorized', () => {
    it('should be able to connect without the auth token', async () =>
      new Promise<void>((resolve, reject) => {
        socket = io(`http://localhost:${app.getHttpServer().address().port}`);
        socket.on('connect_error', (error) => reject(error));
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          resolve();
        });
      }));
  });

  describe('when the user is authorized', () => {
    let token: string;

    beforeEach(async () => {
      const authService = app.get(AuthService);
      token = await authService.generateJwtToken(
        JwtTokenPurpose.websocket,
        maly.id,
      );
      console.log(token);
    });

    it('should be able to connect with the given auth token', async () =>
      new Promise<void>((resolve, reject) => {
        socket = io(`http://localhost:${app.getHttpServer().address().port}`, {
          auth: { token: `Bearer ${token}` },
        });
        socket.on('connect_error', (error) => reject(error));
        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          resolve();
        });
      }));

    it('should not be able to connect with a malformed auth token', async () =>
      new Promise<void>((resolve, reject) => {
        socket = io(`http://localhost:${app.getHttpServer().address().port}`, {
          auth: { token: `Bearer SOME_FAKE_TOKEN` },
        });
        socket.on('connect_error', (error) => {
          expect(error.message).toEqual('jwt malformed');
          resolve();
        });
        socket.on('connect', () => {
          reject('Connected despite malformed JWT');
        });
      }));

    it('should not be able to connect with a fake auth token', async () =>
      new Promise<void>((resolve, reject) => {
        const fakeToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYxMDY4ZTNlZWEwYjUyNWQxOGQ1MmFmYSIsImlhdCI6MTYyNzgxOTU4MiwiZXhwIjoxNjI3ODIwMTgyfQ.PqgQGMZjSJ5Wn2ce951ygln5j9Lf5zw2k57XKyL4hPs';
        socket = io(`http://localhost:${app.getHttpServer().address().port}`, {
          auth: { token: `Bearer ${fakeToken}` },
        });
        socket.on('connect_error', (error) => {
          expect(error.message).toEqual('invalid signature');
          resolve();
        });
        socket.on('connect', () => {
          reject('Connected despite malformed JWT');
        });
      }));
  });
});
