import { EmbedBuilder } from 'discord.js';

interface NoFreeGameServersAvailableOptions {
  game: {
    number: string;
    url: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
}

export const noFreeGameServersAvailable = (
  options: NoFreeGameServersAvailableOptions,
): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle('No free game servers available')
    .setColor('#ff0000')
    .setDescription(
      `Game number: **[${options.game.number}](${options.game.url})**`,
    )
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
};
