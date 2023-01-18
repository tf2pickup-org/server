interface Options {
  host: string;
  port: number;
  username: string;
}

export class MumbleClientNotConnectedError extends Error {
  constructor(public readonly options: Options) {
    super(
      `not connected to the mumble server (${options.username}@${options.host}:${options.port})`,
    );
  }
}
