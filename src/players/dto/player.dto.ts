export interface PlayerDto {
  id: string;
  name: string;
  steamId: string;
  joinedAt: Date;
  avatar: {
    small: string;
    medium: string;
    large: string;
  };
  roles: ('super user' | 'admin' | 'bot')[];
  etf2lProfileId?: number;
  _links: {
    href: string;
    title?: string;
  }[];
}
