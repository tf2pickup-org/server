import { prop, Ref } from '@typegoose/typegoose';
import { Player } from './player';

export class PlayerBan {
  _id: string;

  @prop({ ref: 'Player', required: true })
  public player!: Ref<Player>;

  @prop({ ref: 'Player', required: true })
  public admin!: Ref<Player>;

  @prop({ required: true })
  public start!: Date;

  @prop({ required: true })
  public end!: Date;

  @prop()
  public reason?: string;
}
