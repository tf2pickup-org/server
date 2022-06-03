import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface Change {
  old: string;
  new: string;
}

interface PlayerProfileUpdatedOptions {
  player: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  admin: {
    name: string;
    profileUrl: string;
    avatarUrl: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
  changes: Record<string, Change>;
}

const generateChangesText = (changes: Record<string, Change>) => {
  const changesText = [];
  for (const name in changes) {
    changesText.push(
      `${name}: **${changes[name].old} => ${changes[name].new}**`,
    );
  }

  return changesText.join('\n');
};

export const playerProfileUpdated = (options: PlayerProfileUpdatedOptions) =>
  new MessageEmbed()
    .setColor(Colors.PlayerProfileUpdated)
    .setAuthor({
      name: options.admin.name,
      iconURL: options.admin.avatarUrl,
      url: options.admin.profileUrl,
    })
    .setTitle('Player profile updated')
    .setThumbnail(options.player.avatarUrl)
    .setDescription(
      `Player: **[${options.player.name}](${
        options.player.profileUrl
      })**\n${generateChangesText(options.changes)}`,
    )
    .setFooter({ text: options.client.name, iconURL: options.client.iconUrl })
    .setTimestamp();
