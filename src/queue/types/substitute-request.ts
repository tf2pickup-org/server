import { Tf2ClassName } from '@/shared/models/tf2-class-name';

export interface SubstituteRequest {
  gameId: string;
  gameNumber: number;
  gameClass: Tf2ClassName;
  team: string;
}
