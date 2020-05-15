export default () => ({

  /**
   * Specifies whether users without an ETF2L account are allowed or not.
   */
  requireEtf2lAccount: true,

  /**
   * Players with less hours in TF2 than this value will be not be allowed to register.
   * Default: 500
   */
  minimumTf2InGameHours: 500,

  queue: {
    /**
     * Time players have to ready up before they are kicked out of the queue.
     * Default: 40 * 1000  (40 seconds).
     */
    readyUpTimeout: 40 * 1000,

    /**
     * Time the queue stays in ready-up state before going back to the 'waiting' state, unless all 12 players ready up.
     * Default: 60 * 1000 (1 minute).
     */
    readyStateTimeout: 60 * 1000,

    /**
     * How many times the last played map cannot be an option to vote for.
     * Default: 2
     */
    mapCooldown: 2,
  },

  /**
   * Time after which the server will be cleaned up & released after a match ends.
   * Default: 120 * 1000 (2 minutes).
   */
  serverCleanupDelay: 120 * 1000,

  /**
   * To have all the discord integration enabled, the DISCORD_BOT_TOKEN env constant must be set.
   */
  discordNotifications: {
    /**
     * Announcements prompting players to join the pickup queue will be sent when there are at least
     * requiredPlayers * promptPlayerThresholdRatio players.
     * For 6v6, a ratio of 0.5 means the announcements will start to be sent once there are 6 or more
     * players in the queue (12 * 0.5 = 6).
     * Default: 0.5
     */
    promptPlayerThresholdRatio: 0.5,

    /**
     * Specifies the minimum delay between prompts.
     * Default: 5 * 60 * 1000 (5 minutes).
     */
    promptAnnouncementDelay: 5 * 60 * 1000,
  },

  twitchTvApiEndpoint: 'https://api.twitch.tv/helix',

});
