import { Environment } from '@/environment/environment';
import { assertIsError } from '@/utils/assert-is-error';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { SecretPurpose } from '../types/secret-purpose';

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
      (secret: string, done: (err: Error | null, result?: boolean) => void) => {
        try {
          const result = this.validate(secret);
          done(null, result);
        } catch (error) {
          assertIsError(error);
          done(error);
        }
      },
    );
  }

  validate(secret: string) {
    if (secret !== this.environment.gameServerSecret) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
