import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Equals, IsBoolean } from 'class-validator';
import { ConfigurationEntryKey } from './configuration-entry-key';

@Schema()
export class DenyPlayersWithNoSkillAssigned extends MongooseDocument {
  constructor(denyPlayersWithNoSkillAssigned = false) {
    super();
    this.key = ConfigurationEntryKey.denyPlayersWithNoSkillAssigned;
    this.value = denyPlayersWithNoSkillAssigned;
  }

  @Equals(ConfigurationEntryKey.denyPlayersWithNoSkillAssigned)
  key: ConfigurationEntryKey.denyPlayersWithNoSkillAssigned;

  @IsBoolean()
  @Prop({ default: false })
  value: boolean;
}

export const denyPlayersWithNoSkillAssignedSchema =
  SchemaFactory.createForClass(DenyPlayersWithNoSkillAssigned);
