import { MessageEmbed } from 'discord.js';
import { Colors } from './colors';

interface GameServerAddedOptions {
  gameServer: {
    name: string;
    address: string;
    port: string;
  };
  client: {
    name: string;
    iconUrl: string;
  };
}

export const gameServerAdded = (options: GameServerAddedOptions) =>
  new MessageEmbed()
    .setColor(Colors.GameServerAdded)
    .setTitle('Game server added')
    .setDescription(
      [
        `Name: **${options.gameServer.name}**`,
        `Address: **${options.gameServer.address}:${options.gameServer.port}**`,
      ].join('\n'),
    )
    .setFooter({
      text: options.client.name,
      iconURL: options.client.iconUrl,
    })
    .setTimestamp();
