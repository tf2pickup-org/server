import { MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface PlayerBanRevokedFields {
  player: string;
  reason: string;
  playerProfileUrl: string;
  adminResponsible: string;
}

export function playerBanRevoked(fields: PlayerBanRevokedFields): MessageEmbedOptions {
  return {
    color: Colors.PlayerBanRevoked,
    title: `Ban revoked by ${fields.adminResponsible}`,
    fields: [
      {
        name: 'Player',
        value: `[${fields.player}](${fields.playerProfileUrl})`,
      },
      {
        name: 'Reason',
        value: fields.reason,
      },
    ],
    timestamp: new Date(),
  };
}
