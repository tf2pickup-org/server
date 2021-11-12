type TimeOfTheDay =
  | 'morning' /* 06-12 */
  | 'afternoon' /* 12-18 */
  | 'evening' /* 18-24 */
  | 'night' /* 24-06 */;

export interface GameLaunchTimeSpan {
  dayOfWeek: number; // day of the week as a number between 1 (Sunday) and 7 (Saturday)
  timeOfTheDay: TimeOfTheDay;
  count: number;
}
