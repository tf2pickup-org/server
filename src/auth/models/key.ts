import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Key {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  privateKeyEncoded: string;

  @Prop({ required: true })
  publicKeyEncoded: string;
}

export type KeyDocument = Key & Document;
export const keySchema = SchemaFactory.createForClass(Key);
