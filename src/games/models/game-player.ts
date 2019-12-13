import { prop } from '@typegoose/typegoose';

export class GamePlayer {
  @prop({ required: true })
  public playerId!: string;

  @prop({ required: true })
  public teamId!: string;

  @prop({ required: true })
  public gameClass: string;

  @prop({ default: 'active' })
  public status: 'active' | 'waiting for substitute' | 'replaced';
}
