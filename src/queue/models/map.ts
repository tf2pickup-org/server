import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';
import { Document, Types } from 'mongoose';
import { MapPoolItemDto } from '../dto/map-pool-item.dto';

@Schema()
export class Map extends Serializable<MapPoolItemDto> {
  __v?: number;

  @TransformObjectId()
  _id?: Types.ObjectId;

  @IsString()
  @Prop({ required: true, unique: true })
  name: string;

  @IsString()
  @IsOptional()
  @Prop()
  execConfig?: string;

  // when the cooldown is 0, we're good to use this map again
  @Prop({ default: 0 })
  cooldown?: number;

  async serialize(): Promise<MapPoolItemDto> {
    return {
      name: this.name,
      execConfig: this.execConfig,
    };
  }
}

export type MapDocument = Map & Document;
export const mapSchema = SchemaFactory.createForClass(Map);
