import { EmbedBuilder } from 'discord.js';
import { Colors } from './colors';

interface SubstituteRequestOptions {
  gameNumber: number;
  gameClass: string;
  team: string;
  gameUrl: string;
}

export const substituteRequest = (options: SubstituteRequestOptions) =>
  new EmbedBuilder()
    .setColor(Colors.SubstituteRequest)
    .setTitle('A substitute is needed')
    .addFields(
      {
        name: 'Game no.',
        value: `#${options.gameNumber}`,
      },
      {
        name: 'Class',
        value: options.gameClass,
      },
      {
        name: 'Team',
        value: options.team,
      },
    )
    .setURL(options.gameUrl)
    .setTimestamp();
