/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { configureApplication } from '@/configure-application';
import { PlayersService } from '@/players/services/players.service';
import { players } from './test-data';
import { AuthService } from '@/auth/services/auth.service';
import { JwtTokenPurpose } from '@/auth/types/jwt-token-purpose';

describe('Player action logs (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when the user is not authorized', () => {
    it('GET /player-action-logs returns 401', async () => {
      await request(app.getHttpServer()).get('/player-action-logs').expect(401);
    });
  });

  describe('when the user is not an admin', () => {
    let authToken: string;

    beforeAll(async () => {
      const playersService = app.get(PlayersService);
      const player = await playersService.findBySteamId(players[2]);
      const authService = app.get(AuthService);
      authToken = await authService.generateJwtToken(
        JwtTokenPurpose.auth,
        player.id,
      );
    });

    it('GET /player-action-logs returns 401', async () => {
      await request(app.getHttpServer())
        .get('/player-action-logs')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(401);
    });
  });

  describe('when the user is a super-user', () => {
    let authToken: string;

    beforeAll(async () => {
      const playersService = app.get(PlayersService);
      const player = await playersService.findBySteamId(players[0]);
      const authService = app.get(AuthService);
      authToken = await authService.generateJwtToken(
        JwtTokenPurpose.auth,
        player.id,
      );
    });

    it('GET /player-action-logs returns 200', async () => {
      await request(app.getHttpServer())
        .get('/player-action-logs')
        .set('Cookie', [`auth_token=${authToken}`])
        .expect(200);
    });
  });
});
