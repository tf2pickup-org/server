import { generate } from 'generate-password';

export const generateRconPassword = () =>
  generate({ length: 10, numbers: true, uppercase: true });
