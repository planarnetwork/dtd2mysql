import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";
import {DateTimeFormatter} from "js-joda";

/**
 * Extract the calendars from the TransXChange journeys
 */
export class CalendarStream extends GTFSFileStream<TransXChangeJourney> {
  private datesSeen: Record<string, boolean> = {};
  private dateFormatter: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");

  protected header = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date";

  protected transform(journey: TransXChangeJourney): void {
    if (!this.datesSeen[journey.calendar.id]) {
      this.datesSeen[journey.calendar.id] = true;
      this.pushLine(`${journey.calendar.id},${journey.calendar.days},${journey.calendar.startDate.format(this.dateFormatter)},${journey.calendar.endDate.format(this.dateFormatter)}`);
    }
  }

}

