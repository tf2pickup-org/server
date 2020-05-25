import { Test, TestingModule } from '@nestjs/testing';
import { MessageEmbedFactoryService } from './message-embed-factory.service';
import { PlayersService } from '@/players/services/players.service';
import moment = require('moment');
import { Environment } from '@/environment/environment';
import { map } from 'rxjs/operators';
import { ObjectId } from 'mongodb';

class PlayersServiceStub {
  _adminId = new ObjectId();
  _playerId = new ObjectId();

  players = new Map([
    [this._adminId, { name: 'FAKE_ADMIN' }],
    [this._playerId, { name: 'FAKE_PLAYER' }],
  ]);

  getById(id: ObjectId) { return Promise.resolve(this.players.get(id)); }
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
        admin: playersService._adminId,
        player: playersService._playerId,
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
        player: playersService._playerId,
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

  describe('fromNameChange()', () => {
    it('should render the MessageEmbed', async () => {
      const ret = await service.fromNameChange({ name: 'FAKE_PLAYER', id: 'FAKE_PLAYER_ID' } as any, 'OLD_NAME');

      expect(ret.title).toEqual('Player name changed');
      expect(ret.fields).toEqual([
        { name: 'Old name', value: 'OLD_NAME', inline: false },
        { name: 'New name', value: 'FAKE_PLAYER', inline: false },
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

  describe('fromSkillChange()', () => {
    it('should render skill changes', async () => {
      const ret = await service.fromSkillChange(
        playersService._playerId,
        new Map([['scout', 1], ['soldier', 2]]),
        new Map([['scout', 1], ['soldier', 3], ['medic', 4]]),
      );

      expect(ret.title).toEqual('Player\'s skill has been updated');
      expect(ret.fields).toEqual([
        { name: 'Player name', value: 'FAKE_PLAYER', inline: false },
        { name: 'soldier', value: '2 => 3', inline: false },
        { name: 'medic', value: '1 => 4', inline: false },
      ])
    });

    it('should not render anything if there are no changes', async () => {
      const ret = await service.fromSkillChange(
        playersService._playerId,
        new Map([['scout', 1], ['soldier', 1]]),
        new Map([['scout', 1], ['soldier', 1]]),
      );

      expect(ret).toBeNull();
    });

    it('should not render changes for null => 1', async () => {
      const ret = await service.fromSkillChange(
        playersService._playerId,
        new Map(),
        new Map([['scout', 1], ['soldier', 2]]),
      );

      expect(ret.fields).toEqual([
        { name: 'Player name', value: 'FAKE_PLAYER', inline: false },
        { name: 'soldier', value: '1 => 2', inline: false },
      ]);
    });
  });
});
