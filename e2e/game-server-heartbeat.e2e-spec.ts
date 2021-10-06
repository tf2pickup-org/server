/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Game server heartbeat (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3000);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('denies request on wrong secret', () => {
    it('POST /game-servers', async () => {
      return request(app.getHttpServer())
        .post(`/game-servers`)
        .send({
          name: 'test',
          address: '192.168.1.1',
          port: '27015',
          rconPassword: '123456',
        })
        .set('Authorization', 'secret wrongsecret')
        .expect(401);
    });
  });

  describe('adds game server', () => {
    it('POST /game-servers', async () => {
      return request(app.getHttpServer())
        .post('/game-servers')
        .send({
          name: 'test',
          address: '192.168.1.1',
          port: '27015',
          rconPassword: '123456',
        })
        .set('Authorization', 'secret xxxxxx')
        .expect(201)
        .then((response) => {
          const body = response.body;
          expect(body.name).toEqual('test');
          expect(body.address).toEqual('192.168.1.1');
          expect(body.port).toEqual('27015');
          expect(body.rconPassword).toBe(undefined);
          expect(body.isOnline).toBe(true);
        });
    });
  });
});
