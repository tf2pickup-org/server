import { MongooseDocument } from '@/utils/mongoose-document';
import { isRefType, prop, Ref } from '@typegoose/typegoose';
import { Expose, Transform, Type } from 'class-transformer';
import { DiagnosticCheck } from './diagnostic-check';
import { DiagnosticRunStatus } from './diagnostic-run-status';
import { GameServer } from './game-server';

export class GameServerDiagnosticRun extends MongooseDocument {
  @Expose()
  @Transform(({ value, obj }) => value ?? obj._id?.toString())
  id?: string;

  @prop({ default: () => new Date() })
  launchedAt?: Date;

  @Transform(({ value }) => (isRefType(value) ? value.toString() : value))
  @prop({ required: true, ref: () => GameServer })
  gameServer: Ref<GameServer>;

  @Type(() => DiagnosticCheck)
  @prop({ required: true, type: () => [DiagnosticCheck], _id: false })
  checks: DiagnosticCheck[];

  @prop({ enum: DiagnosticRunStatus, default: DiagnosticRunStatus.pending })
  status?: DiagnosticRunStatus;

  getCheckByName(name: string) {
    return this.checks.find((check) => check.name === name);
  }
}
