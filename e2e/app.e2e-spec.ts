/* eslint-disable jest/expect-expect */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { MockLogReceiver } from './mock-log-receiver';
import { LogReceiver } from 'srcds-log-receiver';

describe('AppController (e2e)', () => {
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

  it('GET /', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200);
  });
});
