import { Rcon } from 'rcon-client/lib';

interface CreateRconOptions {
  host: string;
  port: number;
  rconPassword: string;
}

export const createRcon = async (opts: CreateRconOptions): Promise<Rcon> =>
  new Promise((resolve, reject) => {
    const rcon = new Rcon({
      host: opts.host,
      port: opts.port,
      password: opts.rconPassword,
      timeout: 30000,
    });

    rcon.on('error', (error) => {
      return reject(error);
    });

    rcon.connect().then(resolve).catch(reject);
  });
