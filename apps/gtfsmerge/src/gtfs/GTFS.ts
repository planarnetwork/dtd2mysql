
export type AgencyID = string;

export interface Agency {
  agency_id: AgencyID;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang: string;
  agency_phone: string;
  agency_fare_url: string | null;
}

export type ServiceID = string | number;

export interface Calendar {
  service_id: ServiceID,
  monday: 0 | 1,
  tuesday: 0 | 1,
  wednesday: 0 | 1,
  thursday: 0 | 1,
  friday: 0 | 1,
  saturday: 0 | 1,
  sunday: 0 | 1,
  start_date: string,
  end_date: string,
}

export interface CalendarDate {
  service_id: ServiceID;
  date: string;
  exception_type: number;
}

export interface Trip {
  route_id: RouteID;
  service_id: ServiceID;
  trip_id: number;
  trip_headsign: string;
  trip_short_name: string;
  direction_id: 0 | 1;
  wheelchair_accessible: 0 | 1 | 2;
  bikes_allowed: 0 | 1 | 2;
}

export type RouteID = number | string;

export interface Route {
  route_id: RouteID;
  agency_id: AgencyID;
  route_short_name: string;
  route_long_name: string;
  route_type: RouteType;
  route_text_color: string | null;
  route_color: string | null;
  route_url: string | null;
  route_desc: string | null;
}

export enum RouteType {
  Tram = 0,
  Subway = 1,
  Rail = 2,
  Bus = 3,
  Ferry = 4,
  Cable  = 5,
  Gondola = 6,
  Funicular = 7
}

export type StopID = string;

export interface Stop {
  stop_id: StopID;
  stop_code: string;
  stop_name: string;
  stop_desc: string;
  stop_lat: number;
  stop_lon: number;
  zone_id: number;
  stop_url: string;
  location_type: 0 | 1;
  parent_station: string;
  stop_timezone: string;
  wheelchair_boarding: 0 | 1 | 2;
}

export interface StopTime {
  trip_id: number;
  arrival_time: string;
  departure_time: string;
  stop_id: StopID;
  stop_sequence: number;
  stop_headsign: string;
  pickup_type: 0 | 1 | 2 | 3;
  drop_off_type: 0 | 1 | 2 | 3;
  shape_dist_traveled: null;
  timepoint: 0 | 1;
}

export interface Transfer {
  from_stop_id: StopID,
  to_stop_id: StopID,
  transfer_type: TransferType,
  min_transfer_time: number
}

export enum TransferType {
  Recommended = 0,
  Timed = 1,
  MinTime = 2,
  NotPossible = 3
}

