import { Player } from '@/players/models/player';
import { MongooseDocument } from '@/utils/mongoose-document';
import { isRefType, prop, Ref } from '@typegoose/typegoose';
import { Transform } from 'class-transformer';

export class TwitchTvProfile extends MongooseDocument {
  @Transform(({ value }) => (isRefType(value) ? value.toString() : value))
  @prop({ ref: () => Player, index: true })
  player?: Ref<Player>;

  @prop({ required: true, index: true })
  userId: string;

  @prop({ required: true })
  login: string;

  @prop()
  displayName?: string;

  @prop()
  profileImageUrl?: string;
}
