import { app } from '@/app';
import { PlayersService } from '@/players/services/players.service';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { Document } from 'mongodb';
import { Types } from 'mongoose';
import { PlayerActionDto } from '../dto/player-action.dto';

@Schema({ collection: 'playeractions' })
export class PlayerActionEntry extends Serializable<PlayerActionDto> {
  @Exclude({ toPlainOnly: true })
  __v?: number;

  @Exclude({ toPlainOnly: true })
  @TransformObjectId()
  _id?: Types.ObjectId;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player: Types.ObjectId;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  action: string;

  @Prop({ default: () => new Date() })
  timestamp: Date;

  async serialize(): Promise<PlayerActionDto> {
    const playersService = app.get(PlayersService);

    return {
      player: await playersService.getById(this.player),
      timestamp: this.timestamp,
      action: this.action,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
    };
  }
}

export type PlayerActionEntryDocument = PlayerActionEntry & Document;
export const playerActionEntrySchema =
  SchemaFactory.createForClass(PlayerActionEntry);
