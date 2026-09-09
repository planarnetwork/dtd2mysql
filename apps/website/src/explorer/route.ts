/**
 * Where in the explorer we are, as a hash.
 *
 * A hash rather than a path because the site is static: `/feeds/explorer/stop/910GCLPHMJC/` would
 * have to be a file on disk, and there are 9,181 stops. A hash also survives navigation without
 * dropping the feed, which for a 21 MB zip somebody dropped in from their own filesystem is the
 * difference between a link that works and one that asks them to start again.
 *
 * The point of all of this is that a finding can be pasted into an issue.
 */
export type Route =
  | {view: "overview"}
  | {view: "file", file: string, page: number, sort?: string, descending?: boolean, filters: Filters}
  | {view: "stop", id: string}
  | {view: "trip", id: string}
  | {view: "route", id: string}
  | {view: "service", id: string}
  | {view: "board", id: string, date: number}
  | {view: "checks", id?: string}
  | {view: "validation", code?: string}
  | {view: "provenance"};

export type Filters = Readonly<Record<string, string>>;

const PAGE = "page";
const SORT = "sort";
const DESC = "desc";

/**
 * Read a hash. Anything unrecognised is the overview rather than an error page: a link from an issue
 * written against a different version of this should land somewhere, not nowhere.
 */
export function parse(hash: string): Route {
  const [path, query] = hash.replace(/^#\/?/, "").split("?");
  const parts = path.split("/").filter(part => part.length > 0).map(decodeURIComponent);
  const params = new URLSearchParams(query ?? "");

  switch (parts[0]) {
    case undefined:
    case "":
      return {view: "overview"};

    case "file": {
      if (parts[1] === undefined) {
        return {view: "overview"};
      }

      const sort = params.get(SORT);

      // The keys are added rather than set to undefined, so a route read back off a hash is the same
      // object a caller would have built to make it. Anything else makes every comparison awkward.
      return {
        view: "file",
        file: parts[1],
        page: page(params.get(PAGE)),
        ...(sort === null ? {} : {sort}),
        ...(params.get(DESC) === "1" ? {descending: true} : {}),
        filters: filters(params)
      };
    }

    case "stop":
    case "trip":
    case "route":
    case "service":
      return parts[1] === undefined
        ? {view: "overview"}
        : {view: parts[0], id: parts[1]} as Route;

    case "board":
      return parts[1] === undefined || parts[2] === undefined ? {view: "overview"} : {
        view: "board",
        id: parts[1],
        date: Number(parts[2])
      };

    case "checks":
      return parts[1] === undefined ? {view: "checks"} : {view: "checks", id: parts[1]};

    case "validation":
      return parts[1] === undefined ? {view: "validation"} : {view: "validation", code: parts[1]};

    case "provenance":
      return {view: "provenance"};

    default:
      return {view: "overview"};
  }
}

/**
 * Write a hash.
 *
 * Every id is encoded, because a GTFS id may hold a slash and this repository's own trip ids hold
 * underscores and could one day hold worse. Round tripping is the test that matters.
 */
export function format(route: Route): string {
  switch (route.view) {
    case "overview":
      return "#/";

    case "file": {
      const params = new URLSearchParams();

      for (const [column, term] of Object.entries(route.filters)) {
        if (term.length > 0) {
          params.set(`f.${column}`, term);
        }
      }

      if (route.page > 0) {
        params.set(PAGE, String(route.page));
      }
      if (route.sort !== undefined) {
        params.set(SORT, route.sort);
      }
      if (route.descending) {
        params.set(DESC, "1");
      }

      const query = params.toString();

      return `#/file/${encodeURIComponent(route.file)}${query.length > 0 ? `?${query}` : ""}`;
    }

    case "stop":
    case "trip":
    case "route":
    case "service":
      return `#/${route.view}/${encodeURIComponent(route.id)}`;

    case "board":
      return `#/board/${encodeURIComponent(route.id)}/${route.date}`;

    case "checks":
      return route.id === undefined ? "#/checks" : `#/checks/${encodeURIComponent(route.id)}`;

    case "validation":
      return route.code === undefined ? "#/validation" : `#/validation/${encodeURIComponent(route.code)}`;

    case "provenance":
      return "#/provenance";
  }
}

/** A column filter is `f.` and the column name, so a column called `page` cannot shadow the paging. */
function filters(params: URLSearchParams): Filters {
  const found: Record<string, string> = {};

  for (const [key, value] of params) {
    if (key.startsWith("f.") && value.length > 0) {
      found[key.slice(2)] = value;
    }
  }

  return found;
}

function page(value: string | null): number {
  const page = Number(value);

  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 0;
}
