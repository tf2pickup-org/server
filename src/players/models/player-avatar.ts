import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class PlayerAvatar extends MongooseDocument {
  @Prop()
  small: string; // 32x32 px

  @Prop()
  medium: string; // 64x64 px

  @Prop()
  large: string; // 184x184 px
}

export const playerAvatarSchema = SchemaFactory.createForClass(PlayerAvatar);
