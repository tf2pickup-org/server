import { prop } from '@typegoose/typegoose';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class TwitchTvUser {

  @Expose()
  @prop({ required: true })
  userId!: string;

  @Expose()
  @prop({ required: true })
  login!: string;

  @Expose()
  @prop()
  displayName?: string;

  @Expose()
  @prop()
  profileImageUrl?: string;

}
