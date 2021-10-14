import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Equals } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class DiscordServerOptions {
  @Prop({ required: true })
  guildId: string;

  @Prop()
  queueNotificationsChannelId?: string;

  @Prop()
  substituteMentionRole?: string;

  @Prop()
  adminNotificationsChannelId?: string;

  @Prop()
  adminRole?: string;
}

const discordServerOptionsSchema = SchemaFactory.createForClass(DiscordServerOptions);

@Schema()
export class Discord extends MongooseDocument {
  constructor() {
    super();
    this.key = ConfigurationEntryKey.discord;
  }

  @Equals(ConfigurationEntryKey.discord)
  key: ConfigurationEntryKey.discord;

  @Type(() => DiscordServerOptions)
  @Prop({ type: [discordServerOptionsSchema], required: true, _id: false })
  servers: DiscordServerOptions[];
}

export const discordSchema = SchemaFactory.createForClass(Discord);
