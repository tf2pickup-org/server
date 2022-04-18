import { generate } from 'generate-password';

export const generateGameserverPassword = () =>
  generate({ length: 10, numbers: true, uppercase: true });
