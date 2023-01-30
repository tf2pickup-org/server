import { INestApplicationContext } from '@nestjs/common';

export let app: INestApplicationContext;

export const setApp = (newApp: INestApplicationContext): void => {
  app = newApp;
};
