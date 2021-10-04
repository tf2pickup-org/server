import { Environment } from '@/environment/environment';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { SecretPurpose } from '../secret-purpose';

@Injectable()
export class GameServerSecretStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  SecretPurpose.gameServer,
) {
  constructor(private environment: Environment) {
    super(
      {
        header: 'Authorization',
        prefix: 'secret ',
      },
      true,
      async (secret, done) => {
        try {
          const result = await this.validate(secret);
          done(null, result);
        } catch (error) {
          done(error);
        }
      },
    );
  }

  async validate(secret: string) {
    if (secret !== this.environment.gameServerSecret) {
      throw new Error('unauthorized');
    }

    return true;
  }
}
