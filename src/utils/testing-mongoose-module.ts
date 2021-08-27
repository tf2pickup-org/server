import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const mongooseTestingModule = (mongod: MongoMemoryServer) =>
  MongooseModule.forRoot(mongod.getUri(), {
    useCreateIndex: true,
    useFindAndModify: false,
  });
