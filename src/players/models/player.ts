import { Game } from '@/games/models/game';
import { Link } from '@/shared/models/link';
import { MongooseDocument } from '@/utils/mongoose-document';
import { prop, index, Ref } from '@typegoose/typegoose';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { PlayerAvatar } from './player-avatar';
import { PlayerRole } from './player-role';

@index({ steamId: 'hashed' })
export class Player extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id?: string;

  @prop({ required: true, unique: true, trim: true })
  name!: string;

  @prop({ unique: true })
  steamId?: string; // SteamID64 only

  @prop({ default: () => new Date() })
  joinedAt?: Date;

  @Type(() => PlayerAvatar)
  @prop()
  avatar?: PlayerAvatar;

  @prop({ type: () => [String], enum: PlayerRole, default: [] })
  roles?: PlayerRole[];

  @Exclude({ toPlainOnly: true })
  @prop({ default: false })
  hasAcceptedRules?: boolean;

  @prop({ index: true })
  etf2lProfileId?: number;

  @Exclude({ toPlainOnly: true })
  @prop({ ref: () => Game })
  activeGame?: Ref<Game>;

  @Expose()
  @Type(() => Link)
  get _links(): Link[] {
    return [
      new Link({
        href: `/players/${this.id}/linked-profiles`,
        title: 'Linked profiles',
      }),
    ];
  }
}
