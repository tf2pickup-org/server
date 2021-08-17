import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { Player } from '@/players/models/player';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { players } from './test-data';

describe('Websocket (e2e)', () => {
  let app: INestApplication;
  let player: Player;
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
    player = await playersService.findBySteamId(players[0]);
  });

  afterAll(async () => {
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
        player.id,
      );
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

    describe('and when he is connected', () => {
      beforeEach(
        async () =>
          new Promise<void>((resolve, reject) => {
            socket = io(
              `http://localhost:${app.getHttpServer().address().port}`,
              {
                auth: { token: `Bearer ${token}` },
              },
            );
            socket.on('connect_error', (error) => reject(error));
            socket.on('connect', () => {
              resolve();
            });
          }),
      );

      it('should receive profile update events', async () =>
        new Promise<void>((resolve) => {
          socket.on('profile update', (changes) => {
            expect(changes).toMatchObject({
              player: { name: 'maly updated', id: player.id },
            });
            resolve();
          });

          const playersService = app.get(PlayersService);
          playersService.updatePlayer(player.id, { name: 'maly updated' });
        }));
    });

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
