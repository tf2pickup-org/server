/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { LogReceiver } from 'srcds-log-receiver';
import { MockLogReceiver } from './mock-log-receiver';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mockLogReceiver: MockLogReceiver;

  beforeAll(() => {
    mockLogReceiver = new MockLogReceiver({ address: 'localhost', port: 9871 });
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ AppModule ],
    }).overrideProvider(LogReceiver)
      .useValue(mockLogReceiver)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/steam', () => {
    return request(app.getHttpServer())
      .get('/auth/steam')
      .expect(302)
      .expect('Location', /https:\/\/steamcommunity\.com\/openid\/login/);
  });
});
