import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MongooseDocument } from '@/utils/mongoose-document';
import { Expose, Transform, Type } from 'class-transformer';
import { DiagnosticCheck, diagnosticCheckSchema } from './diagnostic-check';
import { DiagnosticRunStatus } from './diagnostic-run-status';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';

@Schema()
export class GameServerDiagnosticRun extends MongooseDocument {
  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  @Transform(({ value }) => value.toISOString(), { toPlainOnly: true })
  @Prop({ default: () => new Date() })
  launchedAt?: Date;

  @TransformObjectId()
  @Prop({ required: true, type: Types.ObjectId, ref: 'StaticGameServer' })
  gameServer!: Types.ObjectId;

  @Type(() => DiagnosticCheck)
  @Prop({ required: true, type: [diagnosticCheckSchema], _id: false })
  checks!: DiagnosticCheck[];

  @Prop({ enum: DiagnosticRunStatus, default: DiagnosticRunStatus.pending })
  status!: DiagnosticRunStatus;

  getCheckByName(name: string) {
    return this.checks.find((check) => check.name === name);
  }
}

export const gameServerDiagnosticRunSchema = SchemaFactory.createForClass(
  GameServerDiagnosticRun,
);
