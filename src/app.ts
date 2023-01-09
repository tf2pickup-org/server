import { INestApplication } from '@nestjs/common';

export let app: INestApplication | null = null;

export const setApp = (newApp: INestApplication): void => {
  app = newApp;
};
