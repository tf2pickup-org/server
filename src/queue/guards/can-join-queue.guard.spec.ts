import { ConfigurationService } from '@/configuration/services/configuration.service';
import { GameId } from '@/games/game-id';
import { Player } from '@/players/models/player';
import { PlayerBan } from '@/players/models/player-ban';
import { PlayerBansService } from '@/players/services/player-bans.service';
import { PlayersService } from '@/players/services/players.service';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Types } from 'mongoose';
import { PlayerDeniedError } from '../../shared/errors/player-denied.error';
import { CanJoinQueueGuard } from './can-join-queue.guard';
import { QueueService } from '../services/queue.service';
import { NoSuchSlotError } from '../errors/no-such-slot.error';
import { Tf2ClassName } from '@/shared/models/tf2-class-name';

jest.mock('@/configuration/services/configuration.service');
jest.mock('@/players/services/player-bans.service');
jest.mock('@/players/services/players.service');
jest.mock('../services/queue.service');

describe('CanJoinQueueGuard', () => {
  let guard: CanJoinQueueGuard;
  let configurationService: jest.Mocked<ConfigurationService>;
  let playerBansService: jest.Mocked<PlayerBansService>;
  let playersService: jest.Mocked<PlayersService>;
  let queueService: jest.Mocked<QueueService>;

  beforeEach(() => {
    configurationService = new ConfigurationService(
      // @ts-ignore
      null,
      null,
    ) as jest.Mocked<ConfigurationService>;
    playerBansService = new PlayerBansService(
      // @ts-ignore
      null,
      null,
      null,
      null,
    ) as jest.Mocked<PlayerBansService>;
    playersService = new PlayersService(
      // @ts-ignore
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ) as jest.Mocked<PlayersService>;
    queueService = new QueueService(
      // @ts-ignore
      null,
      null,
      null,
      null,
    ) as jest.Mocked<QueueService>;
    guard = new CanJoinQueueGuard(
      configurationService,
      playerBansService,
      playersService,
      queueService,
    );
  });

  beforeEach(() => {
    configurationService.get.mockImplementation((key: string) =>
      Promise.resolve(
        {
          'queue.deny_players_with_no_skill_assigned': false,
          'queue.player_skill_threshold': 1,
        }[key],
      ),
    );
    playerBansService.getPlayerActiveBans.mockResolvedValue([]);
    queueService.getSlotById.mockReturnValue({
      id: 1,
      gameClass: Tf2ClassName.soldier,
      playerId: null,
      ready: false,
    });
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('#canActivate()', () => {
    let client: { user?: Player };
    let context: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
      client = {};
      context = {
        switchToWs: jest.fn().mockImplementation(() => ({
          getClient: jest.fn().mockReturnValue(client),
          getData: jest.fn(),
        })),
        getArgByIndex: jest.fn().mockReturnValue({ slotId: 1 }),
      } as unknown as jest.Mocked<ExecutionContext>;
    });

    describe('when not logged in', () => {
      it('should deny', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      });
    });

    describe('when the player has not accepted rules', () => {
      let player: Player;

      beforeEach(() => {
        player = new Player();
        player.hasAcceptedRules = false;
        client.user = player;
        playersService.getById.mockResolvedValue(player);
      });

      it('should deny', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(
          PlayerDeniedError,
        );
      });
    });

    describe('when the player has no skill assigned', () => {
      let player: Player;

      beforeEach(() => {
        player = new Player();
        player.hasAcceptedRules = true;
        client.user = player;
        playersService.getById.mockResolvedValue(player);
      });

      describe('and he should be denied', () => {
        beforeEach(() => {
          configurationService.get.mockImplementation((key: string) =>
            Promise.resolve(
              {
                'queue.deny_players_with_no_skill_assigned': true,
                'queue.player_skill_threshold': 1,
              }[key],
            ),
          );
        });

        it('should deny', async () => {
          await expect(guard.canActivate(context)).rejects.toThrow(
            PlayerDeniedError,
          );
        });
      });

      describe("but it's ok", () => {
        it('should allow', async () => {
          expect(await guard.canActivate(context)).toBe(true);
        });
      });
    });

    describe('when the player is banned', () => {
      let player: Player;

      beforeEach(() => {
        player = new Player();
        player.hasAcceptedRules = true;
        client.user = player;
        playersService.getById.mockResolvedValue(player);

        const ban = new PlayerBan();
        playerBansService.getPlayerActiveBans.mockResolvedValue([ban]);
      });

      it('should deny', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(
          PlayerDeniedError,
        );
      });
    });

    describe('when the player is involved in a game', () => {
      let player: Player;

      beforeEach(() => {
        player = new Player();
        player.hasAcceptedRules = true;
        player.activeGame = new Types.ObjectId() as GameId;
        client.user = player;
        playersService.getById.mockResolvedValue(player);
      });

      it('should deny', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(
          PlayerDeniedError,
        );
      });
    });

    describe('when the slot does not exist', () => {
      let player: Player;

      beforeEach(() => {
        player = new Player();
        player.hasAcceptedRules = true;
        client.user = player;
        playersService.getById.mockResolvedValue(player);
        queueService.getSlotById.mockReturnValue(undefined);
      });

      it('should deny', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(
          NoSuchSlotError,
        );
      });
    });

    describe("when player's skill is too low", () => {
      let player: Player;

      beforeEach(() => {
        player = new Player();
        player.hasAcceptedRules = true;
        player.skill = new Map([[Tf2ClassName.soldier, 0]]);
        client.user = player;
        playersService.getById.mockResolvedValue(player);
      });

      it('should deny', async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(
          PlayerDeniedError,
        );
      });
    });
  });
});
