import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { configureApplication } from '@/configure-application';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import * as request from 'supertest';
import { players } from './test-data';
import { waitABit } from './utils/wait-a-bit';

describe('Manage player bans (e2e)', () => {
  let app: INestApplication;
  let playersService: PlayersService;
  let adminToken: string;
  let playerSocket: Socket;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    app.enableShutdownHooks();
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
        await playersService.findBySteamId(players[1])
      ).id,
    );

    playerSocket = io(
      `http://localhost:${app.getHttpServer().address().port}`,
      {
        auth: { token: `Bearer ${playerToken}` },
      },
    );
  });

  afterAll(async () => {
    await waitABit(1000);

    playerSocket.disconnect();
    await waitABit(1000);
    await app.close();
  });

  it('should manage bans', async () => {
    const adminId = (await playersService.findBySteamId(players[0])).id;
    const playerId = (await playersService.findBySteamId(players[1])).id;
    let banId: string;

    // admin applies ban
    await request(app.getHttpServer())
      .post(`/players/${playerId}/bans`)
      .set('Cookie', [`auth_token=${adminToken}`])
      .send({
        player: playerId,
        admin: adminId,
        start: '2023-02-11T14:05:19.383Z',
        end: '2023-02-11T15:05:19.383Z',
        reason: 'test',
      })
      .expect(201)
      .then((response) => {
        const body = response.body;
        expect(body.player).toEqual(playerId);
        expect(body.admin).toEqual(adminId);
        expect(body.reason).toEqual('test');
        banId = body.id;
      });

    // admin lists bans
    await request(app.getHttpServer())
      .get(`/players/${playerId}/bans`)
      .set('Cookie', [`auth_token=${adminToken}`])
      .expect(200)
      .then((response) => {
        expect(response.body.length).toBe(1);
        expect(response.body[0].id).toEqual(banId);
      });

    // TODO player sees the ban on their profile
    // TODO admin revokes the ban
  });
});
