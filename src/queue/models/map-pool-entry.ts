import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { Serializable } from '@/shared/serializable';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';
import { Document, Types } from 'mongoose';
import { MapPoolEntryDto } from '../dto/map-pool-item.dto';

@Schema({ collection: 'maps' })
// Name is MapPoolEntry instead of just Map to avoid name conflicts
export class MapPoolEntry extends Serializable<MapPoolEntryDto> {
  constructor(name: string, execConfig?: string) {
    super();
    this.name = name;
    this.execConfig = execConfig;
  }

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

  async serialize(): Promise<MapPoolEntryDto> {
    return {
      name: this.name,
      execConfig: this.execConfig,
    };
  }
}

export type MapPoolEntryDocument = MapPoolEntry & Document;
export const mapPoolEntrySchema = SchemaFactory.createForClass(MapPoolEntry);
