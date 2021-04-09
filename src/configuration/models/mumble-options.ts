export interface MumbleOptions {
  type: 'mumble';
  url: string;
  port: number;
  password?: string;
  channelName?: string;
}
