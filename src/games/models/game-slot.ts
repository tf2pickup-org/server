import { PlayerConnectionStatus } from './player-connection-status';
import { Tf2Team } from './tf2-team';
import { SlotStatus } from './slot-status';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Exclude } from 'class-transformer';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { PlayerId } from '@/players/types/player-id';
import { Serializable } from '@/shared/serializable';
import { GameSlotDto } from '../dto/game-slot-dto';
import { app } from '@/app';
import { PlayersService } from '@/players/services/players.service';

@Schema()
export class GameSlot extends Serializable<GameSlotDto> {
  @Exclude({ toPlainOnly: true })
  _id?: Types.ObjectId;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'Player', index: true })
  player!: PlayerId;

  @Prop({ required: true, enum: Tf2Team })
  team!: Tf2Team;

  @Prop({ required: true, enum: Tf2ClassName })
  gameClass!: Tf2ClassName;

  @Prop({ index: true, enum: SlotStatus, default: SlotStatus.active })
  status!: SlotStatus;

  @Prop({
    enum: PlayerConnectionStatus,
    default: PlayerConnectionStatus.offline,
  })
  connectionStatus!: PlayerConnectionStatus;

  async serialize(): Promise<GameSlotDto> {
    const playersService = app.get(PlayersService);

    return {
      player: await playersService.getById(this.player),
      team: this.team,
      gameClass: this.gameClass,
      status: this.status,
      connectionStatus: this.connectionStatus,
    };
  }
}

export const gameSlotSchema = SchemaFactory.createForClass(GameSlot);
