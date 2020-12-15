import { prop } from '@typegoose/typegoose';

export class TwitchTvUser {

  @prop({ required: true })
  userId!: string;

  @prop({ required: true })
  login!: string;

  @prop()
  displayName?: string;

  @prop()
  profileImageUrl?: string;

}
