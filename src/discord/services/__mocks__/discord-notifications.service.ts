import { PlayerBan } from '@/players/models/player-ban';
import { Player } from '@/players/models/player';
import { SubstituteRequest } from '@/queue/substitute-request';

export class DiscordNotificationsService {

  notifyQueue(currentPlayerCount: number, targetPlayerCount: number) {
    return null;
  }

  async notifySubstituteRequest(substituteRequest: SubstituteRequest) {
    return Promise.resolve();
  }

  async notifyPlayerBanAdded(playerBan: PlayerBan) {
    return Promise.resolve();
  }

  async notifyPlayerBanRevoked(playerBan: PlayerBan) {
    return Promise.resolve();
  }

  async notifyNewPlayer(player: Player) {
    return Promise.resolve();
  }

  async notifyNameChange(player: Player, oldName: string) {
    return Promise.resolve();
  }

  async notifySkillChange(playerId: string, oldSkill: Map<string, number>, newSkill: Map<string, number>) {
    return Promise.resolve();
  }

}
