import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class RefreshToken {
  @Prop({ required: true, index: true })
  value!: string;

  @Prop({ default: () => new Date() })
  public createdAt?: Date;
}

export type RefreshTokenDocument = RefreshToken & Document;
export const refreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
