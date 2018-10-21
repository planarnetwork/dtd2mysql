import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {DateTimeFormatter} from "js-joda";

/**
 * Extract the calendars from the TransXChange journeys
 */
export class CalendarStream extends GTFSFileStream<TransXChangeJourney> {
  private readonly datesSeen: Record<string, boolean> = {};
  private readonly dateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");

  protected header = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date";

  protected transform(journey: TransXChangeJourney): void {
    if (!this.datesSeen[journey.calendar.id]) {
      const from = journey.calendar.startDate.format(this.dateFormatter);
      const to = journey.calendar.endDate.format(this.dateFormatter);

      this.pushLine(`${journey.calendar.id},${journey.calendar.days},${from},${to}`);
      this.datesSeen[journey.calendar.id] = true;
    }
  }

}

