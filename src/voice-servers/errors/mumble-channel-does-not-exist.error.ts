export class MumbleChannelDoesNotExistError extends Error {
  constructor(public readonly channelName: string) {
    super(`mumble channel ${channelName} does not exist`);
  }
}
