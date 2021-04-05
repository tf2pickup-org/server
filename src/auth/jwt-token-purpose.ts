export enum JwtTokenPurpose {
  auth /**< used by the client to make standard API calls (expiration time: 15 minutes) */,
  refresh /**< used by the client to obtain the new auth token (expiration time: 7 days, number of uses: 1) */,
  websocket /**< used by the client to identify himself over the websocket (expiration time: 10 minutes) */,
  context /**< used by the server to keep the context across external calls (e.g. twitch.tv OAuth) */,
}
