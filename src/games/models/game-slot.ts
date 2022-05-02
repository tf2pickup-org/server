import { PlayerConnectionStatus } from './player-connection-status';
import { Tf2Team } from './tf2-team';
import { SlotStatus } from './slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Exclude } from 'class-transformer';
import { ExposeObjectId } from '@/shared/decorators/expose-object-id';

@Schema()
export class GameSlot {
  @Exclude({ toPlainOnly: true })
  _id?: Types.ObjectId;

  @ExposeObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: Types.ObjectId;

  @Prop({ required: true, enum: Tf2Team })
  team!: Tf2Team;

  @Prop({ required: true, enum: Tf2ClassName })
  gameClass!: Tf2ClassName;

  @Prop({ index: true, enum: SlotStatus, default: SlotStatus.active })
  status?: SlotStatus;

  @Prop({
    enum: PlayerConnectionStatus,
    default: PlayerConnectionStatus.offline,
  })
  connectionStatus?: PlayerConnectionStatus;
}

export const gameSlotSchema = SchemaFactory.createForClass(GameSlot);
