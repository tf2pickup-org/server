import { Rcon } from 'rcon-client';

interface CreateRconOptions {
  host: string;
  port: number;
  rconPassword: string;
}

export const createRcon = async (opts: CreateRconOptions): Promise<Rcon> => {
  const rcon = new Rcon({
    host: opts.host,
    port: opts.port,
    password: opts.rconPassword,
    timeout: 30000,
  });

  return await rcon.connect();
};
