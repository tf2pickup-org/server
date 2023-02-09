import { PlayerId } from '@/players/types/player-id';
import { TransformObjectId } from '@/shared/decorators/transform-object-id';
import { IsMongoId } from 'class-validator';
import { GameId } from '../game-id';

export class ReplacePlayerPayload {
  @IsMongoId()
  @TransformObjectId()
  gameId!: GameId;

  @IsMongoId()
  @TransformObjectId()
  replaceeId!: PlayerId;
}
