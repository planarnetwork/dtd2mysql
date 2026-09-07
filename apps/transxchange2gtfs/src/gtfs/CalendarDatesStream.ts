import {CalendarDateRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {CALENDAR_DATES} from "./TxcFeed";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {LocalDate, DateTimeFormatter} from "@js-joda/core";

/**
 * Extract the calendars dates from the TransXChange journeys
 */
export class CalendarDatesStream extends RowStream<TransXChangeJourney, CalendarDateRow> {
  public readonly file = CALENDAR_DATES;

  private readonly datesSeen: Record<string, boolean> = {};
  private readonly dateRowsSeen: Set<string> = new Set();
  private readonly dateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");

  protected transform(journey: TransXChangeJourney): void {
    if (!this.datesSeen[journey.calendar.id]) {
      this.datesSeen[journey.calendar.id] = true;

      this.pushDates(journey.calendar.excludes, Day.REMOVED, journey.calendar.id);
      this.pushDates(journey.calendar.includes, Day.ADDED, journey.calendar.id);
    }
  }

  private pushDates(dates: LocalDate[], type: Day, serviceId: number): void {
    for (const date of dates) {
      const key = `${serviceId}:${date.toString()}`;

      if (!this.dateRowsSeen.has(key)) {
        this.dateRowsSeen.add(key);
        this.pushRow({
          service_id: serviceId,
          date: date.format(this.dateFormatter),
          exception_type: type
        });
      }
    }
  }

}

enum Day {
  ADDED = 1,
  REMOVED = 2
}
