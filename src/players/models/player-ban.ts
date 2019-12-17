import { prop, Ref } from '@typegoose/typegoose';
import { Player } from './player';
import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';

export class PlayerBan {
  _id: string;

  @IsMongoId()
  @prop({ ref: 'Player', required: true })
  public player!: Ref<Player>;

  @IsMongoId()
  @prop({ ref: 'Player', required: true })
  public admin!: Ref<Player>;

  @IsNotEmpty()
  @prop({ required: true, default: () => Date.now() })
  public start!: Date;

  @IsNotEmpty()
  @prop({ required: true })
  public end!: Date;

  @IsString()
  @prop()
  public reason?: string;
}
