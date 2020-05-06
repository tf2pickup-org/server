import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { InjectModel } from 'nestjs-typegoose';
import { RefreshToken } from '../models/refresh-token';
import { ReturnModelType } from '@typegoose/typegoose';
import { KeyStoreService } from './key-store.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AuthService implements OnModuleInit {

  private logger = new Logger(AuthService.name);

  constructor(
    private keyStoreService: KeyStoreService,
    @InjectModel(RefreshToken) private refreshTokenModel: ReturnModelType<typeof RefreshToken>,
  ) { }

  onModuleInit() {
    this.removeOldRefreshTokens();
  }

  async generateJwtToken(purpose: 'auth' | 'refresh' | 'ws' | 'context', userId: string): Promise<string> {
    switch (purpose) {
      case 'auth': {
        const key = this.keyStoreService.getKey('auth', 'sign');
        return sign({ id: userId }, key, { algorithm: 'ES512', expiresIn: '15m' });
      }

      case 'refresh': {
        const key = this.keyStoreService.getKey('refresh', 'sign');
        const token = sign({ id: userId }, key, { algorithm: 'ES512', expiresIn: '7d' });
        await this.refreshTokenModel.create({ value: token });
        return token;
      }

      case 'ws': {
        const key = this.keyStoreService.getKey('ws', 'sign');
        return sign({ id: userId }, key, { algorithm: 'HS256', expiresIn: '10m' });
      }

      case 'context': {
        const key = this.keyStoreService.getKey('context', 'sign');
        return sign({ id: userId }, key, { algorithm: 'ES512', expiresIn: '1m' })
      }
    }
  }

  async refreshTokens(oldRefreshToken: string): Promise<{ refreshToken: string, authToken: string }> {
    const result = await this.refreshTokenModel.findOne({ value: oldRefreshToken });
    if (!result) {
      throw new Error('invalid token');
    }

    const key = this.keyStoreService.getKey('refresh', 'verify');
    const decoded = verify(oldRefreshToken, key, { algorithms: ['ES512'] }) as { id: string; iat: number; exp: number };
    await result.remove();

    const userId = decoded.id;
    const refreshToken = await this.generateJwtToken('refresh', userId);
    const authToken = await this.generateJwtToken('auth', userId);
    return { refreshToken, authToken };
  }

  verifyToken(purpose: 'auth' | 'context', token: string): { id: string; iat: number; exp: number } {
    const key = this.keyStoreService.getKey(purpose, 'verify');
    return verify(token, key, { algorithms: ['ES512'] }) as { id: string; iat: number; exp: number };
  }

  @Cron('0 0 4 * * *') // 4 am everyday
  async removeOldRefreshTokens() {
    // refresh tokens are leased for one week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    this.logger.verbose(`removing refresh tokens that are older than ${oneWeekAgo.toString()}`);
    const { n } = await this.refreshTokenModel.deleteMany({
      createdAt: {
        $lt: oneWeekAgo,
      },
    });
    this.logger.verbose(`removed ${n} refresh token(s)`);
  }

}
