import { MongooseDocument } from '@/utils/mongoose-document';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { Document } from 'mongoose';

@Schema()
export class Certificate extends MongooseDocument {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value, obj }) => value ?? obj._id.toString())
  id!: string;

  @Prop({ required: true })
  purpose!: string;

  @Prop()
  clientKey?: string;

  @Prop()
  certificate?: string;
}

export type CertificateDocument = Certificate & Document;
export const certificateSchema = SchemaFactory.createForClass(Certificate);
