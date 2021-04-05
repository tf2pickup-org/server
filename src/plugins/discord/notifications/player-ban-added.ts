import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';
import moment = require('moment');

interface PlayerBanAddedOptions {
  admin: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  player: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
  reason: string;
  ends: Date;
}

export const playerBanAdded = (options: PlayerBanAddedOptions) =>
  new MessageEmbed()
    .setColor(Colors.PlayerBanAdded)
    .setAuthor(
      options.admin.name,
      options.admin.avatarUrl,
      options.admin.profileUrl,
    )
    .setTitle('Player ban added')
    .setThumbnail(options.player.avatarUrl)
    .setDescription(
      [
        `Player: **[${options.player.name}](${options.player.profileUrl})**`,
        `Reason: **${options.reason}**`,
        `Ends: **${moment(options.ends).fromNow()}**`,
      ].join('\n'),
    )
    .setFooter(options.client.name, options.client.iconUrl)
    .setTimestamp();
