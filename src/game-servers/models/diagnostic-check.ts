import { prop } from '@typegoose/typegoose';
import { DiagnosticCheckStatus } from './diagnostic-check-status';

export class DiagnosticCheck {

  @prop({ required: true })
  name: string;

  @prop({ enum: DiagnosticCheckStatus, default: DiagnosticCheckStatus.pending })
  status?: DiagnosticCheckStatus;

  @prop({ type: () => [String], default: [] })
  warnings?: string[];

  @prop({ type: () => [String], default: [] })
  errors?: string[];

  @prop({ required: true })
  critical: boolean;

}
