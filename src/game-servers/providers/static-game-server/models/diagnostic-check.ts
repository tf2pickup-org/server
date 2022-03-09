import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DiagnosticCheckStatus } from './diagnostic-check-status';

@Schema()
export class DiagnosticCheck {
  @Prop({ required: true })
  name: string;

  @Prop({ enum: DiagnosticCheckStatus, default: DiagnosticCheckStatus.pending })
  status?: DiagnosticCheckStatus;

  @Prop({ type: [String], default: [] })
  reportedWarnings?: string[];

  @Prop({ type: [String], default: [] })
  reportedErrors?: string[];

  @Prop({ required: true })
  critical: boolean;
}

export type DiagnosticCheckDocument = DiagnosticCheck & Document;
export const diagnosticCheckSchema =
  SchemaFactory.createForClass(DiagnosticCheck);
