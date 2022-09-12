import { Types } from 'mongoose';
import { ServemeTfServerControls } from './serveme-tf-server-controls';
import { ServemeTfApiService } from './services/serveme-tf-api.service';
import { createRcon } from '@/utils/create-rcon';
import { ServemeTfReservation } from './models/serveme-tf-reservation';
import { ReservationStatus } from './models/reservation-status';

jest.mock('./services/serveme-tf-api.service');
jest.mock('@/utils/create-rcon');

describe('ServemeTfServerControls', () => {
  let controls: ServemeTfServerControls;
  let reservation: ServemeTfReservation;
  let servemeTfApiService: jest.Mocked<ServemeTfApiService>;

  beforeEach(() => {
    reservation = new ServemeTfReservation();
    reservation._id = new Types.ObjectId();
    reservation.startsAt = new Date();
    reservation.endsAt = new Date();
    reservation.serverId = 42;
    reservation.password = 'FAKE_PASSWORD';
    reservation.rcon = 'FAKE_RCON_PASSWORD';
    reservation.tvPassword = 'FAKE_TV_PASSWORD';
    reservation.tvRelayPassword = 'FAKE_TV_RELAY_PASSWORD';
    reservation.status = ReservationStatus.ready;
    reservation.id = 1251216;
    reservation.logsecret = 'FAKE_LOGSECRET';
    reservation.ended = false;
    reservation.steamId = 'FAKE_STEAM_ID';
    reservation.server = {
      id: 299,
      name: 'BolusBrigade #04',
      flag: 'de',
      ip: 'bolus.fakkelbrigade.eu',
      port: '27045',
      latitude: 0,
      longitude: 0,
    };

    servemeTfApiService = new ServemeTfApiService(
      null,
      null,
      null,
    ) as jest.Mocked<ServemeTfApiService>;

    controls = new ServemeTfServerControls(reservation, servemeTfApiService);
  });

  describe('#start()', () => {
    it('should wait for the server to start', async () => {
      await controls.start();
      expect(servemeTfApiService.waitForServerToStart).toHaveBeenCalledWith(
        1251216,
      );
    });
  });

  describe('#rcon()', () => {
    it('should create an rcon connection', async () => {
      await controls.rcon();
      expect(createRcon).toHaveBeenCalledWith({
        host: 'bolus.fakkelbrigade.eu',
        port: 27045,
        rconPassword: 'FAKE_RCON_PASSWORD',
      });
    });
  });

  describe('#getLogsecret()', () => {
    it('should return the reservation logsecret', async () => {
      const logsecret = await controls.getLogsecret();
      expect(logsecret).toEqual('FAKE_LOGSECRET');
    });
  });
});
