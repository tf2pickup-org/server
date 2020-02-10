import { TypegooseModule } from 'nestjs-typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const typegooseTestingModule = (mongod?: MongoMemoryServer) => TypegooseModule.forRootAsync({
  useFactory: async () => {
    mongod = mongod ?? new MongoMemoryServer();
    return {
      uri: await mongod.getConnectionString(),
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
  },
});
