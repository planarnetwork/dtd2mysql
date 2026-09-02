import {Agency, AgencyID, AgencyRow} from "../entity/Agency";
import {Route, RouteRow} from "../entity/Route";

/**
 * A rail operator, as the National Operator Catalogue names one.
 *
 * The NOC gives a two letter code to airlines - `BA` is British Airways - and
 * distinguishes a rail operator by prefixing it with an equals sign, so
 * Southern is `=SN` and Transport for Wales is `=AW`. A feed whose agencies are
 * bare ATOC codes cannot be merged with a bus or metro feed without them
 * colliding with airlines; one that uses the NOC form can.
 *
 * Composed where a file is written, like the ATCO codes. The ATOC code is what
 * a schedule carries and what `agencies` is keyed on, and it stays that way.
 */
export function agencyId(atoc: AgencyID): AgencyID {
  return `=${atoc}`;
}

/**
 * agency.txt as it is written.
 */
export function toAgencyRow(agency: Agency): AgencyRow {
  return {...agency, agency_id: agencyId(agency.agency_id)};
}

/**
 * routes.txt as it is written.
 *
 * Only `agency_id` takes the NOC form. `route_id` is the brand's own id and the
 * names are text for a passenger to read, so neither is a reference to an
 * agency and neither is composed here.
 */
export function toRouteRow(route: Route): RouteRow {
  return {...route, agency_id: agencyId(route.agency_id)};
}
