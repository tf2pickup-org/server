export const config = {

  /**
   * Specifies whether users without an ETF2L account are allowed or not.
   */
  requireEtf2lAccount: true,

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

    /**
     * When prompting players to join the pickup queue, this role will be mentioned in the announcement.
     */
    promptJoinQueueMentionRole: '<@&610855230992678922>',

    /**
     * When enabled, a notification will be sent to the admin channel each time any player receives a ban.
     * Default: true
     */
    notifyBans: true,

    /**
     * When enabled, a notification will be sent to the admin channel each time a new player registers.
     * Default: true
     */
    notifyNewPlayers: true,
  },
};
