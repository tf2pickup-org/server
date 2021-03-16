import { KeyObject } from 'crypto';

export interface KeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
}
