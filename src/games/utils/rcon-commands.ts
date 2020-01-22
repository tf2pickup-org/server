export function addGamePlayer(steamId: string, name: string, teamId: number, gameClass: string) {
  return [
    `sm_game_player_add ${steamId}`,
    `-name "${name}"`,
    `-team ${teamId}`,
    `-class ${gameClass}`,
  ].join(' ');
}

export function changelevel(map: string) {
  return `changelevel ${map}`;
}

export function delAllGamePlayers() {
  return 'sm_game_player_delall';
}

export function delGamePlayer(steamId: string) {
  return `sm_game_player_del ${steamId}`;
}

export function enablePlayerWhitelist() {
  return 'sm_game_player_whitelist 1';
}

export function disablePlayerWhitelist() {
  return 'sm_game_player_whitelist 0';
}

export function execConfig(config: string) {
  return `exec ${config}`;
}

export function kickAll() {
  return 'kickall';
}

export function logAddressAdd(logAddress: string) {
  return `logaddress_add ${logAddress}`;
}

export function logAddressDel(logAddress: string) {
  return `logaddress_del ${logAddress}`;
}

export function setPassword(password: string) {
  return `sv_password ${password}`;
}
