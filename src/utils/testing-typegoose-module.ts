import { TypegooseModule } from 'nestjs-typegoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const typegooseTestingModule = () => TypegooseModule.forRootAsync({
  useFactory: async () => {
    const mongod = new MongoMemoryServer();
    return {
      uri: await mongod.getConnectionString(),
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };
  },
});
