interface ObjectId {
  type: 'object-id';
  objectId: string;
}

interface SteamId {
  type: 'steam-id';
  steamId64: string;
}

export type ObjectIdOrSteamId = ObjectId | SteamId;
