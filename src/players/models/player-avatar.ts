import { MongooseDocument } from '@/utils/mongoose-document';
import { prop } from '@typegoose/typegoose';

export class PlayerAvatar extends MongooseDocument {
  @prop()
  small: string; // 32x32 px

  @prop()
  medium: string; // 64x64 px

  @prop()
  large: string; // 184x184 px
}
