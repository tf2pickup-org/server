import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface SubstituteRequestedOptions {
  player: {
    name: string;
    profileUrl: string;
  };
  admin: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  game: {
    number: string;
    url: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
}

export const substituteRequested = (options: SubstituteRequestedOptions) =>
  new MessageEmbed()
    .setColor(Colors.SubstituteRequested)
    .setAuthor({
      name: options.admin.name,
      iconURL: options.admin.avatarUrl,
      url: options.admin.profileUrl,
    })
    .setTitle('Substitute requested')
    .setDescription(
      `Game number: **[${options.game.number}](${options.game.url})**\nPlayer: **[${options.player.name}](${options.player.profileUrl})**`,
    )
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
