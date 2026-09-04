
import {AgencyID} from "./Agency";

export interface Route {
  route_id: RouteID;
  agency_id: AgencyID;
  route_short_name: string | null;
  route_long_name: string | null;
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
  Cable = 5,
  Gondola = 6,
  Funicular = 7,
  ReplacementBus = 714
}

export type RouteID = string;

/**
 * routes.txt, as it is written. Every field of Route is a column of it.
 */
export type RouteRow = Route;
