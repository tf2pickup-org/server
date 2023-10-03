import { EmbedBuilder } from 'discord.js';
import { Colors } from './colors';

interface SubstituteWasNeededOptions {
  gameNumber: number;
  gameUrl: string;
}

export const substituteWasNeeded = (options: SubstituteWasNeededOptions) =>
  new EmbedBuilder()
    .setColor(Colors.SubstituteRequest)
    .setTitle('A substitute was needed')
    .addFields({
      name: 'Game no.',
      value: `#${options.gameNumber}`,
    })
    .setURL(options.gameUrl ?? null)
    .setTimestamp();
