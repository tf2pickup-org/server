import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const mongooseTestingModule = (mongod?: MongoMemoryServer) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongod = mongod ?? (await MongoMemoryServer.create());
      return {
        uri: mongod.getUri(),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      };
    },
  });
