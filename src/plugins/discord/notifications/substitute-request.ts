import { MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface SubstituteRequestFields {
  gameNumber: number;
  gameClass: string;
  team: string;
  gameUrl: string;
}

export function substituteRequest(
  fields: SubstituteRequestFields,
): MessageEmbedOptions {
  return {
    color: Colors.SubstituteRequest,
    title: 'A substitute is needed',
    fields: [
      {
        name: 'Game no.',
        value: `#${fields.gameNumber}`,
      },
      {
        name: 'Class',
        value: fields.gameClass,
      },
      {
        name: 'Team',
        value: fields.team,
      },
    ],
    url: fields.gameUrl,
    timestamp: new Date(),
  };
}
