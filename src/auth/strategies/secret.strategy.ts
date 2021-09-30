import { Environment } from '@/environment/environment';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

@Injectable()
export class SecretStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'secret',
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
