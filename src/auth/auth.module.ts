import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PlayersModule } from 'src/players/players.module';
import { PassportModule } from '@nestjs/passport';
import { SteamStrategy } from './steam.strategy';
import { ConfigModule } from 'src/config/config.module';
import { AuthController } from './auth.controller';
import { authenticate } from 'passport';
import { TypegooseModule } from 'nestjs-typegoose';
import { RefreshToken } from './models/refresh-token';
import { KeyStoreService } from './key-store.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypegooseModule.forFeature([ RefreshToken ]),

    ConfigModule,
    PlayersModule,
  ],
  providers: [
    AuthService,
    SteamStrategy,
    KeyStoreService,
  ],
  controllers: [
    AuthController,
  ],
})
export class AuthModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(authenticate('steam', { session: false }))
      .forRoutes('/auth/steam');
  }

}
