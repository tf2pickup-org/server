import { EmbedBuilder } from 'discord.js';
import { Colors } from './colors';

interface MapsScrambledOptions {
  actor: {
    name: string;
    profileUrl: string;
    avatarUrl?: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
}

export const mapsScrambled = (options: MapsScrambledOptions) =>
  new EmbedBuilder()
    .setColor(Colors.MapsScrambled)
    .setAuthor({
      name: options.actor.name,
      iconURL: options.actor.avatarUrl,
      url: options.actor.profileUrl,
    })
    .setTitle('Maps scrambled')
    .setThumbnail(options.actor.avatarUrl ?? null)
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
