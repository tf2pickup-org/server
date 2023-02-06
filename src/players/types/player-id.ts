import { Types } from 'mongoose';

declare const _playerId: unique symbol;

export type PlayerId = Types.ObjectId & { [_playerId]: never };
