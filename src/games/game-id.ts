import { Types } from 'mongoose';

declare const _gameId: unique symbol;

export type GameId = Types.ObjectId & { readonly [_gameId]: never };
