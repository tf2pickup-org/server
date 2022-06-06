import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { PlayersModule } from '@/players/players.module';
import { PassportModule } from '@nestjs/passport';
import { SteamStrategy } from './strategies/steam.strategy';
import { AuthController } from './controllers/auth.controller';
import * as passport from 'passport';
import { RefreshToken, refreshTokenSchema } from './models/refresh-token';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthGateway } from './gateways/auth.gateway';
import { setRedirectUrlCookie } from './middleware/set-redirect-url-cookie';
import { Key, KeyDocument, keySchema } from './models/key';
import { Environment } from '@/environment/environment';
import { importOrGenerateKeys } from './import-or-generate-keys';
import { KeyName } from './key-name';
import { generate } from 'generate-password';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameServerSecretStrategy } from './strategies/game-server-secret.strategy';

const passportModule = PassportModule.register({
  defaultStrategy: 'jwt',
  session: false,
});

@Module({
  imports: [
    passportModule,
    MongooseModule.forFeature([
      { name: Key.name, schema: keySchema },
      { name: RefreshToken.name, schema: refreshTokenSchema },
    ]),
    PlayersModule,
  ],
  providers: [
    {
      // keys used to sign & validate auth JWT
      provide: 'AUTH_TOKEN_KEY',
      inject: [getModelToken(Key.name), Environment],
      useFactory: async (
        keyModel: Model<KeyDocument>,
        environment: Environment,
      ) =>
        await importOrGenerateKeys(
          keyModel,
          KeyName.auth,
          environment.keyStorePassphrase,
        ),
    },
    {
      // keys used to sign & validate refresh JWT
      provide: 'REFRESH_TOKEN_KEY',
      inject: [getModelToken(Key.name), Environment],
      useFactory: async (
        keyModel: Model<KeyDocument>,
        environment: Environment,
      ) =>
        await importOrGenerateKeys(
          keyModel,
          KeyName.refresh,
          environment.keyStorePassphrase,
        ),
    },
    {
      provide: 'WEBSOCKET_SECRET',
      useFactory: () =>
        generate({ length: 32, numbers: true, uppercase: true }),
    },
    {
      provide: 'CONTEXT_TOKEN_KEY',
      inject: [getModelToken(Key.name), Environment],
      useFactory: async (
        keyModel: Model<KeyDocument>,
        environment: Environment,
      ) =>
        await importOrGenerateKeys(
          keyModel,
          KeyName.context,
          environment.keyStorePassphrase,
        ),
    },
    AuthService,
    SteamStrategy,
    JwtStrategy,
    AuthGateway,
    GameServerSecretStrategy,
  ],
  controllers: [AuthController],
  exports: [passportModule, AuthService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        setRedirectUrlCookie,
        passport.authenticate('steam', { session: false }),
      )
      .forRoutes('/auth/steam');
  }
}
