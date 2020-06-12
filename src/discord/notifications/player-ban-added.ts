import { MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';
import moment = require('moment');

interface PlayerBanAddedFields {
  admin: string;
  player: string;
  reason: string;
  ends: Date;
  playerProfileUrl: string;
}

export function playerBanAdded(fields: PlayerBanAddedFields): MessageEmbedOptions {
  const endsText = moment(fields.ends).fromNow();

  return {
    color: Colors.PlayerBanAdded,
    title: 'Ban added',
    fields: [
      {
        name: 'Admin',
        value: fields.admin,
      },
      {
        name: 'Player',
        value: `[${fields.player}](${fields.playerProfileUrl})`,
      },
      {
        name: 'Reason',
        value: fields.reason,
      },
      {
        name: 'Ends',
        value: endsText,
      },
    ],
    timestamp: new Date(),
  };
}
