import { Test, TestingModule } from '@nestjs/testing';
import { MessageEmbedFactoryService } from './message-embed-factory.service';
import { PlayersService } from '@/players/services/players.service';
import moment = require('moment');
import { Environment } from '@/environment/environment';

class PlayersServiceStub {
  players = new Map([
    ['FAKE_ADMIN_ID', { name: 'FAKE_ADMIN' }],
    ['FAKE_PLAYER_ID', { name: 'FAKE_PLAYER' }],
  ]);

  getById(id: string) { return Promise.resolve(this.players.get(id)); }
}

const environment = {
  clientUrl: 'FAKE_CLIENT_URL',
};

describe('MessageEmbedFactoryService', () => {
  let service: MessageEmbedFactoryService;
  let playersService: PlayersServiceStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageEmbedFactoryService,
        { provide: PlayersService, useClass: PlayersServiceStub },
        { provide: Environment, useValue: environment },
      ],
    }).compile();

    service = module.get<MessageEmbedFactoryService>(MessageEmbedFactoryService);
    playersService = module.get(PlayersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fromPlayerBanAdded()', () => {
    it('should render the MessageEmbed', async () => {
      const ret = await service.fromPlayerBanAdded({
        admin: 'FAKE_ADMIN_ID',
        player: 'FAKE_PLAYER_ID',
        end: moment().add(1, 'hour').toDate(),
        reason: 'FAKE_REASON',
      } as any);

      expect(ret.title).toEqual('Ban added');
      expect(ret.fields).toEqual([
        { name: 'Admin', value: 'FAKE_ADMIN', inline: false },
        { name: 'Player', value: 'FAKE_PLAYER', inline: false },
        { name: 'Reason', value: 'FAKE_REASON', inline: false },
        { name: 'Ends', value: 'in an hour', inline: false },
      ]);
      expect(ret.timestamp).toBeTruthy();
    });
  });

  describe('fromPlayerBanRevoked()', () => {
    it('should render the MessageEmbed', async () => {
      const ret = await service.fromPlayerBanRevoked({
        player: 'FAKE_PLAYER_ID',
        reason: 'FAKE_REASON',
      } as any);

      expect(ret.title).toEqual('Ban revoked');
      expect(ret.fields).toEqual([
        { name: 'Player', value: 'FAKE_PLAYER', inline: false },
        { name: 'Reason', value: 'FAKE_REASON', inline: false },
      ]);
      expect(ret.timestamp).toBeTruthy();
    });
  });

  describe('fromNewPlayer()', () => {
    it('should render the MessageEmbed', async () => {
      const ret = await service.fromNewPlayer({
        name: 'FAKE_PLAYER',
        id: 'FAKE_PLAYER_ID',
      } as any);

      expect(ret.title).toEqual('New player');
      expect(ret.fields).toEqual([
          { name: 'Name', value: 'FAKE_PLAYER', inline: false },
          { name: 'Profile URL', value: 'FAKE_CLIENT_URL/player/FAKE_PLAYER_ID', inline: false },
      ]);
      expect(ret.timestamp).toBeTruthy();
    });
  });

  describe('fromSubstituteRequest()', () => {
    it('should render the MessageEmbed', async () => {
      const ret = await service.fromSubstituteRequest({
        gameNumber: 123,
        gameClass: 'soldier',
        team: 'red',
        gameId: 'FAKE_GAME_ID',
      });

      expect(ret.title).toEqual('A substitute is needed');
      expect(ret.fields).toEqual([
        { name: 'Game no.', value: '#123', inline: false },
        { name: 'Class', value: 'soldier', inline: false },
        { name: 'Team', value: 'red', inline: false },
      ]);
      expect(ret.url).toEqual('FAKE_CLIENT_URL/game/FAKE_GAME_ID');
      expect(ret.thumbnail).toEqual({ url: 'FAKE_CLIENT_URL/assets/android-icon-192x192.png' });
    });
  });
});
