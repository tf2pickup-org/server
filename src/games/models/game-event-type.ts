export enum GameEventType {
  gameCreated = 'created',
  gameStarted = 'started',
  gameEnded = 'ended',

  gameServerAssigned = 'game server assigned',
  gameServerInitialized = 'game server initialized',

  substituteRequested = 'substitute requested',
  playerReplaced = 'player replaced',

  playerJoinedGameServer = 'player joined game server',
  playerJoinedGameServerTeam = 'player joined game server team',
  playerLeftGameServer = 'player left game server',
}
