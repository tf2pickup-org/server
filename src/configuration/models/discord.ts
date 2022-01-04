import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import { Equals } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class DiscordGuildOptions {
  @Prop({ required: true })
  guildId: string;

  /**
   * Where notifications for all the players are being sent.
   * Set it to a falsy value to disable players notifications at all.
   */
  @Prop()
  queueNotificationsChannelId?: string;

  /**
   * What role to mention in case there's a substitute needed.
   * Set it to a falsy value to disable pinging any role.
   */
  @Prop()
  substituteMentionRole?: string;

  /**
   * Where notifications for admins are being sent.
   * Set it to a falsy value to disable admins notifications at all.
   */
  @Prop()
  adminNotificationsChannelId?: string;

  @Prop()
  adminRole?: string;
}

const discordGuildOptionsSchema =
  SchemaFactory.createForClass(DiscordGuildOptions);

@Schema()
export class Discord extends MongooseDocument {
  constructor() {
    super();
    this.key = ConfigurationEntryKey.discord;
  }

  @Equals(ConfigurationEntryKey.discord)
  key: ConfigurationEntryKey.discord;

  @Type(() => DiscordGuildOptions)
  @Prop({ type: [discordGuildOptionsSchema], required: true, _id: false })
  guilds: DiscordGuildOptions[];
}

export const discordSchema = SchemaFactory.createForClass(Discord);
