import { Injectable } from '@nestjs/common';
import { sign } from 'jsonwebtoken';
import { InjectModel } from 'nestjs-typegoose';
import { RefreshToken } from '../models/refresh-token';
import { ReturnModelType } from '@typegoose/typegoose';
import { KeyStoreService } from './key-store.service';

@Injectable()
export class AuthService {

  private readonly commonTokenOptions = { algorithm: 'ES512' };
  private readonly authTokenOptions = { ...this.commonTokenOptions, expiresIn: '15m' };
  private readonly refreshTokenOptions = { ...this.commonTokenOptions, expiresIn: '7d' };
  private readonly wsTokenOptions = { algorithm: 'HS256', expiresIn: '10m' };

  constructor(
    private keyStoreService: KeyStoreService,
    @InjectModel(RefreshToken) private refreshTokenModel: ReturnModelType<typeof RefreshToken>,
  ) { }

  generateJwtToken(purpose: 'auth' | 'refresh' | 'ws', userId: string): string {
    switch (purpose) {
      case 'auth': {
        const key = this.keyStoreService.getKey('auth', 'sign');
        return sign({ id: userId }, key, this.authTokenOptions);
      }

      case 'refresh': {
        const key = this.keyStoreService.getKey('refresh', 'sign');
        const token = sign({ id: userId }, key, this.refreshTokenOptions);
        this.refreshTokenModel.create({ value: token });
        return token;
      }

      case 'ws': {
        const key = this.keyStoreService.getKey('ws', 'sign');
        return sign({ id: userId }, key, this.wsTokenOptions);
      }

      default:
        throw new Error('unknown purpose');
    }
  }

}
