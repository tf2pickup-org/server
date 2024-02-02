export interface TwitchTvGetStreamsResponse {
  data: {
    game_id: string;
    game_name: string;
    id: string;
    language: string;
    pagination: string;
    started_at: string;
    thumbnail_url: string;
    title: string;
    type: 'live' | '';
    user_id: string;
    user_login: string;
    user_name: string;
    viewer_count: number;
    is_mature: boolean;
  }[];
}
