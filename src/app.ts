import { INestApplication } from '@nestjs/common';

export let app: INestApplication = null;

export const setApp = (newApp: INestApplication) => {
  app = newApp;
};
