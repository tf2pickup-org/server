import { MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface PlayerNameChangedFields {
  oldName: string;
  newName: string;
  profileUrl: string;
}

export function playerNameChanged(fields: PlayerNameChangedFields): MessageEmbedOptions {
  return {
    color: Colors.PlayerNameChanged,
    title: 'Player name changed',
    fields: [
      {
        name: 'Old name',
        value: fields.oldName,
      },
      {
        name: 'New name',
        value: fields.newName,
      },
    ],
    url: fields.profileUrl,
    timestamp: new Date(),
  };
}
