import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const mongooseTestingModule = (mongod?: MongoMemoryServer) =>
  MongooseModule.forRootAsync({
    useFactory: async () => {
      mongod = mongod ?? new MongoMemoryServer();
      return {
        uri: await mongod.getUri(),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true,
      };
    },
  });
