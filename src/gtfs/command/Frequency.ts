
export interface Frequency {
  trip_id: number;
  start_time: string;
  end_time: string;
  headway_secs: number;
  exact_times: 0 | 1;
}