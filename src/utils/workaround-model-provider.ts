import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

interface WorkaroundModelProviderOptions {
  name: string;
  schema: any;
}

export const workaroundModelProvider = (
  options: WorkaroundModelProviderOptions,
) => ({
  provide: getModelToken(options.name),
  inject: [getConnectionToken()],
  useFactory: (connection: Connection) =>
    connection.model(options.name, options.schema),
});
