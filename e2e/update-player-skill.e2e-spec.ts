import { AppModule } from '@/app.module';
import { JwtTokenPurpose } from '@/auth/jwt-token-purpose';
import { AuthService } from '@/auth/services/auth.service';
import { configureApplication } from '@/configure-application';
import { PlayersService } from '@/players/services/players.service';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { players } from './test-data';
import * as request from 'supertest';

describe('Update player skill (e2e)', () => {
  let app: INestApplication;
  let adminAuthToken: string;
  let playerId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    const playersService = app.get(PlayersService);
    const admin = await playersService.findBySteamId(players[0]);
    const authService = app.get(AuthService);
    adminAuthToken = await authService.generateJwtToken(
      JwtTokenPurpose.auth,
      admin.id,
    );

    const player = await playersService.findBySteamId(players[1]);
    playerId = player.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('when not logged in', () => {
    // eslint-disable-next-line jest/expect-expect
    it('PUT /players/:playerId/skill', async () => {
      await request(app.getHttpServer())
        .put(`/players/${playerId}/skill`)
        .send({
          scout: 2,
          soldier: 3,
          demoman: 4,
          medic: 5,
        })
        .expect(401);
    });
  });

  describe('when logged in', () => {
    // eslint-disable-next-line jest/expect-expect
    it('PUT /players/:playerId/skill', async () => {
      await request(app.getHttpServer())
        .put(`/players/${playerId}/skill`)
        .auth(adminAuthToken, { type: 'bearer' })
        .send({
          scout: 2,
          soldier: 3,
          demoman: 4,
          medic: 5,
        })
        .expect(200)
        .then((response) => {
          const body = response.body;
          expect(body).toEqual({
            scout: 2,
            soldier: 3,
            demoman: 4,
            medic: 5,
          });
        });

      await request(app.getHttpServer())
        .delete(`/players/${playerId}/skill`)
        .auth(adminAuthToken, { type: 'bearer' })
        .expect(204);

      await request(app.getHttpServer())
        .get(`/players/${playerId}/skill`)
        .auth(adminAuthToken, { type: 'bearer' })
        .then((respose) => {
          const body = respose.body;
          expect(body).toEqual({});
        });
    });
  });
});
