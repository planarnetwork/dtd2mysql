/**
 * The scalars, on their own, for a consumer that wants nothing else.
 *
 * `@gb-transit/gtfs-schema` itself is cheap to import, but its declarations reach `PlainDate`,
 * which is typed against Temporal and so pulls in `temporal-polyfill` - a whole calendar
 * implementation that a project reading a feed has no use for.
 *
 * So `@gb-transit/gtfs-schema/scalars` is the narrow way in: a duration and a day of the week, from
 * two modules that import nothing. It is what @gb-transit/gtfs-loader uses, which is how a browser
 * journey planner can agree with the feed build about both without inheriting its calendar.
 */
export { SECONDS_IN_DAY, formatDuration, parseDuration } from "./model/Duration.js";
export type { Duration } from "./model/Duration.js";
export type { DayOfWeek } from "./model/DayOfWeek.js";
