import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayersService } from '@/players/services/players.service';
import moment = require('moment');
import { MessageEmbed } from 'discord.js';
import { Player } from '@/players/models/player';
import { Environment } from '@/environment/environment';
import { SubstituteRequest } from '@/queue/substitute-request';

@Injectable()
export class MessageEmbedFactoryService {

  constructor(
    @Inject(forwardRef(() => PlayersService)) private playersService: PlayersService,
    private environment: Environment,
  ) { }

  async fromPlayerBanAdded(playerBan: PlayerBan) {
    const admin = await this.playersService.getById(playerBan.admin.toString());
    const player = await this.playersService.getById(playerBan.player.toString());
    const endText = moment(playerBan.end).fromNow();

    return new MessageEmbed()
      .setColor('#dc3545')
      .setTitle('Ban added')
      .addField('Admin', admin.name)
      .addField('Player', player.name)
      .addField('Reason', playerBan.reason)
      .addField('Ends', endText)
      .setTimestamp();
  }

  async fromPlayerBanRevoked(playerBan: PlayerBan) {
    const player = await this.playersService.getById(playerBan.player.toString());

    return new MessageEmbed()
      .setColor('#9838dc')
      .setTitle('Ban revoked')
      .addField('Player', player.name)
      .addField('Reason', playerBan.reason)
      .setTimestamp();
  }

  async fromNewPlayer(player: Player) {
    return new MessageEmbed()
      .setColor('#33dc7f')
      .setTitle('New player')
      .addField('Name', player.name)
      .addField('Profile URL', `${this.environment.clientUrl}/player/${player.id}`)
      .setTimestamp();
  }

  async fromNameChange(player: Player, oldName: string) {
    return new MessageEmbed()
      .setColor('#5230dc')
      .setTitle('Player name changed')
      .addField('Old name', oldName)
      .addField('New name', player.name)
      .addField('Profile URL', `${this.environment.clientUrl}/player/${player.id}`)
      .setTimestamp();
  }

  async fromSubstituteRequest(substituteRequest: SubstituteRequest) {
    return new MessageEmbed()
      .setColor('#ff557f')
      .setTitle('A substitute is needed')
      .addField('Game no.', `#${substituteRequest.gameNumber}`)
      .addField('Class', substituteRequest.gameClass)
      .addField('Team', substituteRequest.team)
      .setURL(`${this.environment.clientUrl}/game/${substituteRequest.gameId}`)
      .setThumbnail(`${this.environment.clientUrl}/assets/android-icon-192x192.png`);
  }

}
