import {GTFSFileStream} from "./GTFSFileStream";
import {TransXChangeJourney} from "../transxchange/TransXChangeJourneyStream";

/**
 * Extract the calendars from the TransXChange services
 */
export class CalendarStream extends GTFSFileStream<TransXChangeJourney> {
  private datesSeen: Record<string, boolean> = {};

  protected header = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date";

  protected transform(journey: TransXChangeJourney): void {
    if (!this.datesSeen[journey.calendar.id]) {
      this.datesSeen[journey.calendar.id] = true;

      this.push(`${journey.calendar.id},${journey.calendar.days},${journey.calendar.startDate},${journey.calendar.endDate}`);
    }
  }

}

