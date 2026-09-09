/**
 * A trip that runs every so many seconds rather than at written down times.
 *
 * The trip's own stop times are then a pattern - the offsets from one call to
 * the next - and this says between which two times of day that pattern repeats
 * and how often. A bus every twelve minutes from six in the morning is one row
 * here and one trip, rather than forty trips.
 */
export interface Frequency {
  trip_id: string;
  start_time: string;
  end_time: string;
  headway_secs: number;
  /**
   * 1 where the departures are exactly the headway apart and the times can be
   * calculated, 0 or absent where the headway is only how often it comes.
   */
  exact_times?: number | null;
}

/**
 * frequencies.txt, as it is written. Every field of Frequency is a column of it.
 */
export type FrequencyRow = Frequency;
