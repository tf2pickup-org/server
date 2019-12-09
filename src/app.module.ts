import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypegooseModule } from 'nestjs-typegoose';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { AuthModule } from './auth/auth.module';
import { PlayersModule } from './players/players.module';

function createMongodbUri(host: string, port: string, db: string) {
  return `mongodb://${host}:${port}/${db}`;
}

@Module({
  imports: [
    TypegooseModule.forRootAsync({
      imports: [ ConfigModule ],
      inject: [ ConfigService ],
      useFactory: async (configService: ConfigService) => ({
        uri: createMongodbUri(configService.get('MONGODB_HOST'), configService.get('MONGODB_POST'), configService.get('MONGODB_DB')),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
    }),
    ConfigModule,
    AuthModule,
    PlayersModule,
  ],
  controllers: [ AppController] ,
  providers: [ AppService ],
})
export class AppModule { }
