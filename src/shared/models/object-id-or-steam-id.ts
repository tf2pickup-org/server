import { Types } from 'mongoose';

interface ObjectId {
  type: 'object-id';
  objectId: Types.ObjectId;
}

interface SteamId {
  type: 'steam-id';
  steamId64: string;
}

export type ObjectIdOrSteamId = ObjectId | SteamId;
