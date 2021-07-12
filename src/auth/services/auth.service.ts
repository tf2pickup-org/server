import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { RefreshToken, RefreshTokenDocument } from '../models/refresh-token';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvalidTokenError } from '../errors/invalid-token.error';
import { JwtTokenPurpose } from '../jwt-token-purpose';
import { KeyPair } from '../key-pair';
import { InjectModel } from '@nestjs/mongoose';
import { Error, Model } from 'mongoose';

@Injectable()
export class AuthService implements OnModuleInit {
  private logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshTokenDocument>,
    @Inject('AUTH_TOKEN_KEY') private authTokenKey: KeyPair,
    @Inject('REFRESH_TOKEN_KEY') private refreshTokenKey: KeyPair,
    @Inject('WEBSOCKET_SECRET') private websocketSecret: string,
    @Inject('CONTEXT_TOKEN_KEY') private contextTokenKey: KeyPair,
  ) {}

  onModuleInit() {
    this.removeOldRefreshTokens();
  }

  async generateJwtToken(
    purpose: JwtTokenPurpose,
    userId: string,
  ): Promise<string> {
    switch (purpose) {
      case JwtTokenPurpose.auth: {
        const key = this.authTokenKey.privateKey.export({
          format: 'pem',
          type: 'pkcs8',
        });
        return sign({ id: userId }, key, {
          algorithm: 'ES512',
          expiresIn: '15m',
        });
      }

      case JwtTokenPurpose.refresh: {
        const key = this.refreshTokenKey.privateKey.export({
          format: 'pem',
          type: 'pkcs8',
        });
        const token = sign({ id: userId }, key, {
          algorithm: 'ES512',
          expiresIn: '7d',
        });
        await this.refreshTokenModel.create({ value: token });
        return token;
      }

      case JwtTokenPurpose.websocket: {
        const key = this.websocketSecret;
        return sign({ id: userId }, key, {
          algorithm: 'HS256',
          expiresIn: '10m',
        });
      }

      case JwtTokenPurpose.context: {
        const key = this.contextTokenKey.privateKey.export({
          format: 'pem',
          type: 'pkcs8',
        });
        return sign({ id: userId }, key, {
          algorithm: 'ES512',
          expiresIn: '1m',
        });
      }
    }
  }

  async refreshTokens(
    oldRefreshToken: string,
  ): Promise<{ refreshToken: string; authToken: string }> {
    try {
      await this.refreshTokenModel
        .deleteOne({ value: oldRefreshToken })
        .orFail()
        .lean()
        .exec();
      const key = this.refreshTokenKey.publicKey.export({
        format: 'pem',
        type: 'spki',
      });
      const decoded = verify(oldRefreshToken, key, {
        algorithms: ['ES512'],
      }) as { id: string; iat: number; exp: number };

      const userId = decoded.id;
      const refreshToken = await this.generateJwtToken(
        JwtTokenPurpose.refresh,
        userId,
      );
      const authToken = await this.generateJwtToken(
        JwtTokenPurpose.auth,
        userId,
      );
      return { refreshToken, authToken };
    } catch (error) {
      if (error instanceof Error.DocumentNotFoundError) {
        throw new InvalidTokenError();
      } else {
        throw error;
      }
    }
  }

  verifyToken(
    purpose: JwtTokenPurpose.auth | JwtTokenPurpose.context,
    token: string,
  ): { id: string; iat: number; exp: number } {
    let key: string | Buffer;

    switch (purpose) {
      case JwtTokenPurpose.auth:
        key = this.authTokenKey.publicKey.export({
          format: 'pem',
          type: 'spki',
        });
        break;

      case JwtTokenPurpose.context:
        key = this.contextTokenKey.publicKey.export({
          format: 'pem',
          type: 'spki',
        });
        break;
    }

    return verify(token, key, { algorithms: ['ES512'] }) as {
      id: string;
      iat: number;
      exp: number;
    };
  }

  @Cron(CronExpression.EVERY_WEEK)
  async removeOldRefreshTokens() {
    // refresh tokens are leased for one week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    this.logger.verbose(
      `removing refresh tokens that are older than ${oneWeekAgo.toString()}`,
    );
    const { n } = await this.refreshTokenModel.deleteMany({
      createdAt: {
        $lt: oneWeekAgo,
      },
    });
    this.logger.verbose(`removed ${n} refresh token(s)`);
  }
}
