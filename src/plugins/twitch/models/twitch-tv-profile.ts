import { Player } from '@/players/models/player';
import { MongooseDocument } from '@/utils/mongoose-document';
import { prop, Ref } from '@typegoose/typegoose';

export class TwitchTvProfile extends MongooseDocument {
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
