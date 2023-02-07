import { Types } from 'mongoose';

declare const _playerBanId: unique symbol;

export type PlayerBanId = Types.ObjectId & { [_playerBanId]: never };
