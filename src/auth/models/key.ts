import { prop } from '@typegoose/typegoose';

export class Key {
  @prop({ required: true, unique: true })
  name: string;

  @prop({ required: true })
  privateKeyEncoded: string;

  @prop({ required: true })
  publicKeyEncoded: string;
}
