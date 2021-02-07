/**
 * Announcements prompting players to join the pickup queue will be sent when there are at least
 * requiredPlayers * promptPlayerThresholdRatio players.
 * For 6v6, a ratio of 0.5 means the announcements will start to be sent once there are 6 or more
 * players in the queue (12 * 0.5 = 6).
 * Default: 0.5
 */
export const promptPlayerThresholdRatio = 0.5;

/**
 * Specifies the minimum delay between prompts.
 * Default: 5 * 60 * 1000 (5 minutes).
 */
export const promptAnnouncementDelay = 5 * 60 * 1000;

/**
 * Where to find an icon that gets added to message embeds when sending a message to
 * a Discord channel. This path is added to environment CLIENT_URL variable.
 */
export const iconUrlPath = '/assets/favicon.png';
