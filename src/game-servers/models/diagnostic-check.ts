import { prop } from '@typegoose/typegoose';
import { DiagnosticCheckStatus } from './diagnostic-check-status';

export class DiagnosticCheck {

  @prop({ required: true })
  name: string;

  @prop({ enum: DiagnosticCheckStatus, default: DiagnosticCheckStatus.pending })
  status?: DiagnosticCheckStatus;

  @prop({ type: () => [String], default: [] })
  reportedWarnings?: string[];

  @prop({ type: () => [String], default: [] })
  reportedErrors?: string[];

  @prop({ required: true })
  critical: boolean;

}
