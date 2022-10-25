import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

export const waitForTheGameToLaunch = (app: INestApplication, gameId: string) =>
  new Promise<void>((resolve) => {
    setInterval(async () => {
      await request(app.getHttpServer())
        .get(`/games/${gameId}`)
        .then((response) => {
          const body = response.body;
          if (body.stvConnectString) {
            resolve();
          }
        });
    }, 1000);
  });
