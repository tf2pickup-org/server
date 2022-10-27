import { Player } from '@/players/models/player';
import { PlayerChanges } from '../player-changes';

export const extractPlayerChanges = (oldPlayer: Player, newPlayer: Player) => {
  const changes: PlayerChanges = {};

  if (oldPlayer.name !== newPlayer.name) {
    changes.name = { old: oldPlayer.name, new: newPlayer.name };
  }

  const [oldRoles, newRoles] = [oldPlayer, newPlayer].map((player) =>
    player.roles.join(', '),
  );

  if (oldRoles !== newRoles) {
    changes.role = { old: oldRoles, new: newRoles };
  }

  return changes;
};
