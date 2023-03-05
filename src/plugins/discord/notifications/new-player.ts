import { EmbedBuilder } from 'discord.js';
import { Colors } from './colors';

interface NewPlayerOptions {
  name: string;
  profileUrl: string;
}

export const newPlayer = (options: NewPlayerOptions): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(Colors.NewPlayer)
    .setTitle('New player')
    .addFields({
      name: 'Name',
      value: options.name,
    })
    .setURL(options.profileUrl)
    .setTimestamp();
