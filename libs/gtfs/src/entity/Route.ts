
import {AgencyID} from "./Agency";

export interface Route {
  route_id: RouteID;
  agency_id: AgencyID;
  route_short_name: string | undefined;
  route_long_name: string | undefined;
  route_type: RouteType;
  route_text_color: string | undefined;
  route_color: string | undefined;
  route_url: string | undefined;
  route_desc: string | undefined;
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
