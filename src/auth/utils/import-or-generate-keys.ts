import {
  createPrivateKey,
  createPublicKey,
  generateKeyPair as generateKeyPairCb,
} from 'crypto';
import { promisify } from 'util';
import { KeyName } from '../types/key-name';
import { KeyPair } from '../types/key-pair';
import { Logger } from '@nestjs/common';
import { Error, Model } from 'mongoose';
import { Key } from '../models/key';

const generateKeyPair = promisify(generateKeyPairCb);

/**
 * Try to fetch the key
 */
export const importOrGenerateKeys = async (
  keyModel: Model<Key>,
  name: KeyName,
  passphrase: string,
): Promise<KeyPair> => {
  const logger = new Logger('AuthModule');
  logger.debug(`Importing ${name} keys...`);

  try {
    const { privateKeyEncoded, publicKeyEncoded } = await keyModel
      .findOne({ name })
      .orFail()
      .lean()
      .exec();
    const privateKey = createPrivateKey({
      key: privateKeyEncoded,
      format: 'pem',
      passphrase,
    });
    const publicKey = createPublicKey({ key: publicKeyEncoded, format: 'pem' });
    logger.debug(`${name} keys imported.`);
    return { publicKey, privateKey };
  } catch (error) {
    if (error instanceof Error.DocumentNotFoundError) {
      logger.debug(`${name} keys not found, generating new ones...`);

      const keys = await generateKeyPair('ec', { namedCurve: 'secp521r1' });
      await keyModel
        .findOneAndUpdate(
          { name },
          {
            privateKeyEncoded: keys.privateKey
              .export({
                format: 'pem',
                type: 'pkcs8',
                passphrase,
                cipher: 'aes-256-cbc',
              })
              .toString(),
            publicKeyEncoded: keys.publicKey
              .export({
                format: 'pem',
                type: 'spki',
              })
              .toString(),
          },
          { upsert: true },
        )
        .lean()
        .exec();

      return keys;
    } else {
      throw error;
    }
  }
};
