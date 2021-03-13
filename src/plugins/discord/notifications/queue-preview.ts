import { Tf2ClassName } from '@/shared/models/tf2-class-name';
import { Emoji, MessageEmbedOptions } from 'discord.js';
import { Colors } from './colors';

interface QueuePreviewGameClassData {
  gameClass: Tf2ClassName;
  emoji: Emoji;
  players: { name: string; }[];
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

export const queuePreview = (options: QueuePreviewOptions): MessageEmbedOptions => ({
  color: Colors.QueuePreview,
  title: `**${options.playerCount}/${options.requiredPlayerCount} players in the queue!**`,
  description: `Join [${options.clientName}](${options.clientUrl}) to play the next game!`,
  thumbnail: {
    url: options.iconUrl,
  },
  fields: options.gameClassData.map(gameClassData => ({
    name: `${gameClassData.emoji} ${gameClassData.gameClass} (${gameClassData.players.length}/${gameClassData.playersRequired})`,
    value: gameClassData.players.length > 0 ? gameClassData.players
      .map(player => `\u2000\u25CF\u2000${player.name}`)
      .join('\n') : '\u200B',
    inline: true,
  })),
  footer: {
    iconURL: options.iconUrl,
    text: options.clientName,
  },
  timestamp: new Date(),
});
