import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Equals, IsNumber } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

const defaultValue = 5 * 60 * 1000; // 5 minutes

@Schema()
export class TimeToJoinGameServer extends MongooseDocument {
  constructor(timeToJoinGameServer = defaultValue) {
    super();
    this.key = ConfigurationEntryKey.timeToJoinGameServer;
    this.value = timeToJoinGameServer;
  }

  @Equals(ConfigurationEntryKey.timeToJoinGameServer)
  key: ConfigurationEntryKey.timeToJoinGameServer;

  @IsNumber()
  @Prop()
  value: number;
}

export const timeToJoinGameServerSchema =
  SchemaFactory.createForClass(TimeToJoinGameServer);
