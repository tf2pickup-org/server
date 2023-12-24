import { Environment } from '@/environment/environment';
import { generateGameserverPassword } from '@/utils/generate-gameserver-password';
import { generateRconPassword } from '@/utils/generate-rcon-password';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { sample } from 'lodash';
import {
  of,
  switchMap,
  map,
  tap,
  Observable,
  timer,
  takeWhile,
  lastValueFrom,
  exhaustMap,
  from,
} from 'rxjs';
import { ServemeTfConfigurationService } from './serveme-tf-configuration.service';

interface ServemeTfServerOption {
  id: number;
  name: string;
  flag: string;
  ip: string;
  port: string;
  ip_and_port: string;
  sdr: boolean;
  latitude: number;
  longitude: number;
}

// https://github.com/Arie/serveme/blob/eae36b44258e34d98005bd452cfc7c8a3af05318/app/models/reservation.rb#L218
type ReservationStatus =
  | 'Waiting to start'
  | 'Starting'
  | 'Server updating, please be patient'
  | 'Ready'
  | 'SDR Ready' // should not happen
  | 'Ending'
  | 'Ended';

interface ActiveReservationOptions {
  status: ReservationStatus;
  id: number;
  last_number_of_players: number;
  inactive_minute_counter: number;
  logsecret: string;
  start_instantly: boolean;
  end_instantly: boolean;
  provisioned: boolean;
  ended: boolean;
  steam_uid: string;
  server: ServemeTfServerOption;
  errors: { [key: string]: { error: string } };
}

interface ReservationBounds {
  starts_at: string;
  ends_at: string;
}

interface Reservation extends ReservationBounds {
  server_id: number | null;
  password: string;
  rcon: string;
  first_map: string | null;
  tv_password: string;
  tv_relaypassword: string;
  server_config_id: string | null;
  whitelist_id: string | null;
  custom_whitelist_id: string | null;
  auto_end: boolean;
  errors: { [key: string]: { error: string } };
}

type ActiveReservation = Reservation & ActiveReservationOptions;

interface ServemeTfEntryResponse {
  reservation: ReservationBounds;
  actions: {
    find_servers: string;
  };
}

interface ServemeTfFindServersResponse {
  reservation: Reservation;
  servers: ServemeTfServerOption[];
  server_configs: { id: number; file: string }[];
  whitelists: { id: number; file: string }[];
  actions: {
    create: string;
  };
}

interface ServemeTfReservationDetailsResponse {
  reservation: ActiveReservation;
  actions: {
    delete: string;
    idle_reset: string;
  };
}

@Injectable()
export class ServemeTfApiService {
  private logger = new Logger(ServemeTfApiService.name);
  private readonly config: Parameters<HttpService['post']>[2] = {
    params: {
      api_key: this.environment.servemeTfApiKey,
    },
    headers: {
      'Accept-Encoding': 'gzip,deflate,compress', // https://github.com/axios/axios/issues/5346
    },
  };
  private readonly endpointUrl = `https://${this.environment.servemeTfApiEndpoint}/api/reservations`;

  constructor(
    private httpService: HttpService,
    private environment: Environment,
    private servemeTfConfigurationService: ServemeTfConfigurationService,
  ) {}

  async reserveServer(
    serverId?: number,
  ): Promise<ServemeTfReservationDetailsResponse> {
    // https://github.com/Arie/serveme#api
    return await lastValueFrom(
      this.fetchServers().pipe(
        switchMap((response) =>
          from(this.selectServer(response.servers, serverId)).pipe(
            map((server) => ({ response, server })),
          ),
        ),
        switchMap(({ response, server }) =>
          this.httpService.post<ServemeTfReservationDetailsResponse>(
            response.actions.create,
            {
              reservation: {
                starts_at: response.reservation.starts_at,
                ends_at: response.reservation.ends_at,
                rcon: response.reservation.rcon ?? generateRconPassword(),
                password: generateGameserverPassword(),
                server_id: server.id,
                enable_plugins: true,
                enable_demos_tf: true,
              },
            },
            this.config,
          ),
        ),
        map((response) => response.data),
        tap((reservation) =>
          this.logger.log(
            `serveme.tf reservation ${reservation.reservation.id} (${reservation.reservation.server.name}) created`,
          ),
        ),
      ),
    );
  }

  async waitForServerToStart(reservationId: number): Promise<void> {
    return await lastValueFrom(
      timer(1000, 1000).pipe(
        exhaustMap(() => this.fetchReservationDetails(reservationId)),
        map((reservation) => reservation.reservation.status),
        takeWhile((status: ReservationStatus) =>
          [
            'Waiting to start',
            'Starting',
            'Server updating, please be patient',
          ].includes(status),
        ),
        map(() => undefined),
      ),
      { defaultValue: undefined },
    );
  }

  async endServerReservation(
    reservationId: number,
  ): Promise<ServemeTfReservationDetailsResponse> {
    return await lastValueFrom(
      this.fetchReservationDetails(reservationId).pipe(
        switchMap((reservation) => {
          if (!reservation.reservation.ended) {
            return this.httpService
              .delete<ServemeTfReservationDetailsResponse>(
                reservation.actions.delete,
                this.config,
              )
              .pipe(map((response) => response.data));
          } else {
            return of(reservation);
          }
        }),
        tap((reservation) =>
          this.logger.log(
            `serveme.tf reservation ${reservation.reservation.id} (${reservation.reservation.server.name}) ended`,
          ),
        ),
      ),
    );
  }

  async listServers(): Promise<ServemeTfServerOption[]> {
    return await lastValueFrom(this.fetchServers().pipe(map((r) => r.servers)));
  }

  private fetchServers(): Observable<ServemeTfFindServersResponse> {
    return this.httpService
      .get<ServemeTfEntryResponse>(`${this.endpointUrl}/new`, this.config)
      .pipe(
        map((response) => response.data),
        switchMap((entry) =>
          this.httpService.post<ServemeTfFindServersResponse>(
            entry.actions.find_servers,
            {
              reservation: entry.reservation,
            },
            this.config,
          ),
        ),
        map((response) => response.data),
      );
  }

  private fetchReservationDetails(
    reservationId: number,
  ): Observable<ServemeTfReservationDetailsResponse> {
    return this.httpService
      .get<ServemeTfReservationDetailsResponse>(
        `${this.endpointUrl}/${reservationId}`,
        this.config,
      )
      .pipe(map((response) => response.data));
  }

  private async selectServer(
    options: ServemeTfServerOption[],
    serverId?: number,
  ): Promise<ServemeTfServerOption> {
    if (serverId) {
      const ret = options.find((option) => option.id === serverId);
      if (!ret) {
        throw new Error(`no such server option (serverId=${serverId})`);
      }
      return ret;
    }

    const [preferredRegion, banGameservers] = await Promise.all([
      this.servemeTfConfigurationService.getPreferredRegion(),
      this.servemeTfConfigurationService.getBannedGameservers(),
    ]);

    const matchingOptions = options
      // make sure we don't take a SDR server
      // https://partner.steamgames.com/doc/features/multiplayer/steamdatagramrelay
      .filter((s) => s.sdr === false)
      .filter((s) => (preferredRegion ? s.flag === preferredRegion : true))
      .filter((s) => banGameservers.every((ban) => !s.name.includes(ban)));
    const option = sample(matchingOptions);
    if (!option) {
      throw new Error(`could not find any gameservers meeting given criteria`);
    }
    return option;
  }
}
