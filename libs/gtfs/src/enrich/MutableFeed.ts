import {CRS, Stop} from "../entity/Stop";
import {Trip} from "../entity/Trip";
import {Route} from "../entity/Route";
import {Enricher} from "./Enricher";
import {Provenance} from "./Provenance";

/**
 * The built feed, indexed, and writable only through a recorded write.
 *
 * An enricher gets this rather than the arrays, for two reasons. It can find a
 * stop by its code without walking 3,783 of them, which matters when a source
 * has 400,000 rows to match against. And it cannot assign to a field: `set` is
 * the only way in, so every change has an author and a priority, and nothing
 * can quietly overwrite something better.
 *
 * Deliberately narrow. An enricher adds detail to entities the DTD already
 * produced; it does not create trips or delete stops. A source that wants to do
 * that is not an enricher and should say so.
 */
export class MutableFeed {

  private readonly stopIndex: Map<CRS, Stop>;
  private readonly tripIndex: Map<string, Trip>;
  private readonly routeIndex: Map<number, Route>;

  constructor(
    public readonly stops: Stop[],
    public readonly trips: Trip[],
    public readonly routes: Route[],
    private readonly provenance: Provenance = new Provenance()
  ) {
    this.stopIndex = new Map(stops.map(stop => [stop.stop_id, stop]));
    this.tripIndex = new Map(trips.map(trip => [trip.trip_id, trip]));
    this.routeIndex = new Map(routes.map(route => [route.route_id, route]));
  }

  public stop(id: CRS): Stop | undefined {
    return this.stopIndex.get(id);
  }

  public trip(id: string): Trip | undefined {
    return this.tripIndex.get(id);
  }

  public route(id: number): Route | undefined {
    return this.routeIndex.get(id);
  }

  /**
   * Every station, by the code a rider would recognise, so a source keyed on
   * CRS does not have to know about the platform children B23 introduced.
   */
  public get stations(): Stop[] {
    return this.stops.filter(stop => stop.parent_station === null);
  }

  /**
   * Write a field, if the enricher outranks whoever wrote it last.
   *
   * Returns whether it took effect, which an enricher needs to count its own
   * conflicts honestly - a source that reports 3,000 matches while losing 2,900
   * of them has not done what the number suggests.
   */
  public set<E extends Stop | Trip | Route, K extends keyof E>(
    entity: E,
    field: K,
    value: E[K],
    by: Enricher
  ): boolean {
    const kind = entityKind(entity);
    const id = String(identify(entity));
    const applied = this.provenance.record(kind, id, String(field), {
      enricher: by.id,
      priority: by.priority,
      value
    });

    if (applied) {
      entity[field] = value;
    }

    return applied;
  }

  public get ledger(): Provenance {
    return this.provenance;
  }

}

function entityKind(entity: Stop | Trip | Route): string {
  return "stop_id" in entity ? "stop" : "trip_id" in entity ? "trip" : "route";
}

function identify(entity: Stop | Trip | Route): string | number {
  return "stop_id" in entity ? entity.stop_id
    : "trip_id" in entity ? entity.trip_id
      : entity.route_id;
}
