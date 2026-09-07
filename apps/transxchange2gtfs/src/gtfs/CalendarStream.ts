import {CalendarRow} from "@gb-transit/gtfs-schema";
import {RowStream} from "./RowStream";
import {CALENDAR} from "./TxcFeed";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {DateTimeFormatter} from "@js-joda/core";

/**
 * Extract the calendars from the TransXChange journeys
 */
export class CalendarStream extends RowStream<TransXChangeJourney, CalendarRow> {
  public readonly file = CALENDAR;

  private readonly datesSeen: Record<string, boolean> = {};
  private readonly dateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");

  protected transform(journey: TransXChangeJourney): void {
    if (!this.datesSeen[journey.calendar.id]) {
      // DaysOfWeek is Monday first. It used to be spread straight into a
      // positional call, which was correct and unverifiable; naming the seven
      // makes the order something the compiler can see.
      const [monday, tuesday, wednesday, thursday, friday, saturday, sunday] = journey.calendar.days;

      this.pushRow({
        service_id: journey.calendar.id,
        monday, tuesday, wednesday, thursday, friday, saturday, sunday,
        start_date: journey.calendar.startDate.format(this.dateFormatter),
        end_date: journey.calendar.endDate.format(this.dateFormatter)
      });

      this.datesSeen[journey.calendar.id] = true;
    }
  }

}
