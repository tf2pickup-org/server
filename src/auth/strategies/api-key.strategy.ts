import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  HeaderAPIKeyStrategy,
  'api-key',
) {
  constructor() {
    super(
      {
        header: 'Authorization',
        prefix: 'api-key ',
      },
      true,
      async (apiKey, done) => {
        try {
          const result = await this.validate(apiKey);
          done(null, result);
        } catch (error) {
          done(error);
        }
      },
    );
  }

  async validate(apiKey: string) {
    if (apiKey !== '123456') {
      throw new Error('unauthorized');
    }

    return true;
  }
}
