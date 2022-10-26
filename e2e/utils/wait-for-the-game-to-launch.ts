import { INestApplication } from '@nestjs/common';
// skipcq: JS-C1003
import * as request from 'supertest';

export const waitForTheGameToLaunch = (app: INestApplication, gameId: string) =>
  new Promise<void>((resolve) => {
    const i = setInterval(async () => {
      await request(app.getHttpServer())
        .get(`/games/${gameId}`)
        .then((response) => {
          const body = response.body;
          if (body.stvConnectString) {
            clearInterval(i);
            resolve();
          }
        });
    }, 1000);
  });
