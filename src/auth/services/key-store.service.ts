import { Injectable, Logger } from '@nestjs/common';
import { KeyObject, generateKeyPairSync, createPrivateKey, createPublicKey } from 'crypto';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { Environment } from '@/environment/environment';
import { generate } from 'generate-password';

interface KeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
}

type KeyName = 'auth' | 'refresh' | 'ws';
type KeyPurpose = 'sign' | 'verify';

@Injectable()
export class KeyStoreService {

  private readonly logger = new Logger(KeyStoreService.name);
  private keys = new Map<KeyName, KeyPair>();
  private secrets = new Map<KeyName, string>();

  constructor(
    private environment: Environment,
  ) {
    this.initialize();
  }

  getKey(name: KeyName, purpose: KeyPurpose): string | Buffer {
    switch (name) {
      case 'auth':
      case 'refresh': {
        switch (purpose) {
          case 'sign':
            return this.keys.get(name).privateKey.export({ format: 'pem', type: 'pkcs8' });

          case 'verify':
            return this.keys.get(name).publicKey.export({ format: 'pem', type: 'spki' });

          default:
            throw new Error('invalid key purpose');
        }
      }

      case 'ws':
        return this.secrets.get('ws');
    }
  }

  private initialize() {
    if (!existsSync(this.environment.keyStoreFile)) {
      const authKeys = generateKeyPairSync('ec', {
        namedCurve: 'secp521r1',
      });

      this.keys.set('auth', authKeys);

      const refreshKeys = generateKeyPairSync('ec', {
        namedCurve: 'secp521r1',
      });
      this.keys.set('refresh', refreshKeys);

      const data = { };

      for (const key of this.keys.keys()) {
        const { privateKey, publicKey } = this.keys.get(key);
        data[key] = {
          privateKey: privateKey.export({
            format: 'pem',
            type: 'pkcs8',
            passphrase: this.environment.keyStorePassphare,
            cipher: 'aes-256-cbc',
          }) as string,
          publicKey: publicKey.export({
            format: 'pem',
            type: 'spki',
          }) as string,
        };
      }

      writeFileSync(this.environment.keyStoreFile, JSON.stringify(data), 'utf-8');
      this.logger.log('keystore initialized');
    } else {
      const data = JSON.parse(readFileSync(this.environment.keyStoreFile, 'utf-8'));
      Object.keys(data).forEach(key => {
        const keyPair = data[key];
        const privateKey = createPrivateKey({
          key: keyPair.privateKey,
          format: 'pem',
          passphrase: this.environment.keyStorePassphare,
        });

        const publicKey = createPublicKey({
          key: keyPair.publicKey,
          format: 'pem',
        });

        this.keys.set(key as KeyName, { privateKey, publicKey });
      });

      this.logger.log('keys imported successfully');
    }

    const wsSecret = generate({ length: 32, numbers: true, uppercase: true });
    this.secrets.set('ws', wsSecret);
  }

}
