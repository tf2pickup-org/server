import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Emoji, EmbedBuilder } from 'discord.js';
import { Colors } from './colors';

interface QueuePreviewGameClassData {
  gameClass: Tf2ClassName;
  emoji?: Emoji;
  players: { name: string }[];
  playersRequired: number;
}

interface QueuePreviewOptions {
  iconUrl: string;
  clientName: string;
  clientUrl: string;
  playerCount: number;
  requiredPlayerCount: number;
  gameClassData: QueuePreviewGameClassData[];
}

export const queuePreview = (options: QueuePreviewOptions): EmbedBuilder =>
  new EmbedBuilder()
    .setColor(Colors.QueuePreview)
    .setTitle(
      `**${options.playerCount}/${options.requiredPlayerCount} players in the queue!**`,
    )
    .setDescription(
      `Join [${options.clientName}](${options.clientUrl}) to play the next game!`,
    )
    .setThumbnail(options.iconUrl)
    .addFields(
      options.gameClassData.map((gameClassData) => ({
        name: `${gameClassData.emoji?.toString()} ${gameClassData.gameClass} (${
          gameClassData.players.length
        }/${gameClassData.playersRequired})`,
        value:
          gameClassData.players.length > 0
            ? gameClassData.players
                .map((player) => `\u25CF\u2000${player.name}`)
                .join('\n')
            : '\u200B',
        inline: true,
      })),
    )
    .setFooter({
      iconURL: options.iconUrl,
      text: options.clientName,
    })
    .setTimestamp();
