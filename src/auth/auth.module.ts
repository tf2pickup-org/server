import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { PlayersModule } from 'src/players/players.module';
import { PassportModule } from '@nestjs/passport';
import { SteamStrategy } from './strategies/steam.strategy';
import { AuthController } from './controllers/auth.controller';
import { authenticate } from 'passport';
import { TypegooseModule } from 'nestjs-typegoose';
import { RefreshToken } from './models/refresh-token';
import { KeyStoreService } from './services/key-store.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthGateway } from './gateways/auth.gateway';

const passportModule = PassportModule.register({
  defaultStrategy: 'jwt',
  session: false,
});

@Module({
  imports: [
    passportModule,
    TypegooseModule.forFeature([ RefreshToken ]),

    PlayersModule,
  ],
  providers: [
    AuthService,
    KeyStoreService,
    SteamStrategy,
    JwtStrategy,
    AuthGateway,
  ],
  controllers: [
    AuthController,
  ],
  exports: [
    passportModule,
    AuthService,
  ],
})
export class AuthModule implements NestModule {

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(authenticate('steam', { session: false }))
      .forRoutes('/auth/steam');
  }

}
