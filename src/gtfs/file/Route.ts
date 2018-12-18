
import {AgencyID} from "./Agency";

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

export type RouteID = number;