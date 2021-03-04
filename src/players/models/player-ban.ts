import { prop, Ref } from '@typegoose/typegoose';
import { Player } from './player';
import { IsMongoId, IsString, IsNotEmpty } from 'class-validator';

export class PlayerBan {

  @IsMongoId()
  @prop({ ref: () => Player, required: true })
  player!: Ref<Player>;

  @IsMongoId()
  @prop({ ref: () => Player, required: true })
  admin!: Ref<Player>;

  @IsNotEmpty()
  @prop({ required: true, default: () => Date.now() })
  start!: Date;

  @IsNotEmpty()
  @prop({ required: true })
  end!: Date;

  @IsString()
  @prop()
  reason?: string;
}
