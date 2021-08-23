export enum WebsocketEvent {
  profileUpdate = 'profile update',

  gameCreated = 'game created',
  gameUpdated = 'game updated',

  queueSlotsUpdate = 'queue slots update',
  queueStateUpdate = 'queue state update',
  friendshipsUpdate = 'friendships update',
  mapVoteResultsUpdate = 'map vote results update',
  substituteRequestsUpdate = 'substitute requests update',

  playerConnected = 'player connected',
  playerDisconnected = 'player disconnected',
}
