export enum GameState {
  // the game has been created and is awaiting to be assigned a gameserver
  created = 'created',

  // the game has been assigned a gameserver and it is being configured
  configuring = 'configuring',

  // the gameserver is fully configured and is waiting for the match to start
  launching = 'launching',

  // the match is in progress
  started = 'started',

  // the match has ended
  ended = 'ended',

  // the match has been interrupted by an admin (or another factor)
  interrupted = 'interrupted',
}
