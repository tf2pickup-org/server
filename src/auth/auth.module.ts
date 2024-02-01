import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { PlayersModule } from '@/players/players.module';
import { PassportModule } from '@nestjs/passport';
import { SteamStrategy } from './strategies/steam.strategy';
import { AuthController } from './controllers/auth.controller';
// skipcq: JS-C1003
import * as passport from 'passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthGateway } from './gateways/auth.gateway';
import { setRedirectUrlCookie } from './middleware/set-redirect-url-cookie';
import { Key, keySchema } from './models/key';
import { Environment } from '@/environment/environment';
import { importOrGenerateKeys } from './utils/import-or-generate-keys';
import { KeyName } from './types/key-name';
import { generate } from 'generate-password';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GameServerSecretStrategy } from './strategies/game-server-secret.strategy';
import { AUTH_TOKEN_KEY } from './tokens/auth-token-key.token';
import { WEBSOCKET_SECRET } from './tokens/websocket-secret.token';
import { CONTEXT_TOKEN_KEY } from './tokens/context-token-key.token';

const passportModule = PassportModule.register({
  defaultStrategy: 'jwt',
  session: false,
});

@Module({
  imports: [
    passportModule,
    MongooseModule.forFeature([{ name: Key.name, schema: keySchema }]),
    PlayersModule,
  ],
  providers: [
    {
      // keys used to sign & validate auth JWT
      provide: AUTH_TOKEN_KEY,
      inject: [getModelToken(Key.name), Environment],
      useFactory: async (keyModel: Model<Key>, environment: Environment) =>
        await importOrGenerateKeys(
          keyModel,
          KeyName.auth,
          environment.keyStorePassphrase,
        ),
    },
    {
      provide: WEBSOCKET_SECRET,
      useFactory: () =>
        generate({ length: 32, numbers: true, uppercase: true }),
    },
    {
      provide: CONTEXT_TOKEN_KEY,
      inject: [getModelToken(Key.name), Environment],
      useFactory: async (keyModel: Model<Key>, environment: Environment) =>
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        passport.authenticate('steam', { session: false }),
      )
      .forRoutes('/auth/steam');
  }
}
