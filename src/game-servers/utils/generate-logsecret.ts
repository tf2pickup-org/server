import { generate } from 'generate-password';

/**
 * Generate string that will be used with the sv_logsecret command.
 */
export const generateLogsecret = () =>
  generate({
    length: 16,
    numbers: true,
    symbols: false,
    lowercase: false,
    uppercase: false,
  });
