import {Agency, AgencyID} from "../entity/Agency";
import {Route} from "../entity/Route";

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
export function toAgencyRow(agency: Agency): Agency {
  return {...agency, agency_id: agencyId(agency.agency_id)};
}

/**
 * routes.txt as it is written.
 *
 * `route_short_name` and `route_long_name` keep the bare ATOC code: they are
 * text for a passenger to read, not a reference to the agency.
 */
export function toRouteRow(route: Route): Route {
  return {...route, agency_id: agencyId(route.agency_id)};
}
