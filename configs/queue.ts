/**
 * Time players have to ready up before they are kicked out of the queue.
 * Default: 40 * 1000  (40 seconds).
 */
export const readyUpTimeout = 40 * 1000;

/**
 * Time the queue stays in ready-up state before going back to the 'waiting' state, unless all 12 players ready up.
 * Default: 60 * 1000 (1 minute).
 */
export const readyStateTimeout = 60 * 1000;

/**
 * How many times the last played map cannot be an option to vote for.
 * Default: 2
 */
export const mapCooldown = 2;
