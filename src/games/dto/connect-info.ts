interface ConnectInfoProps {
  gameId: string;
  connectInfoVersion: number;
  connectString: string;
  voiceChannelUrl: string;
}

export class ConnectInfo implements ConnectInfoProps {
  constructor(props: ConnectInfoProps) {
    this.gameId = props.gameId;
    this.connectInfoVersion = props.connectInfoVersion;
    this.connectString = props.connectString;
    this.voiceChannelUrl = props.voiceChannelUrl;
  }

  gameId: string;
  connectInfoVersion: number;
  connectString: string;
  voiceChannelUrl: string;
}
