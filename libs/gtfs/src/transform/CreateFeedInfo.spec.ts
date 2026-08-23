import {describe, it, expect} from "vitest";
import {createFeedInfo} from "./CreateFeedInfo";
import {Calendar} from "../entity/Calendar";
import {CalendarDate} from "../entity/CalendarDate";
import {DateRange} from "../build/BuildContext";

const range: DateRange = {
  from: Temporal.PlainDate.from("2024-01-01"),
  to: Temporal.PlainDate.from("2024-04-01")
};

const calendar = (start_date: string, end_date: string): Calendar => ({
  service_id: 1, monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1, sunday: 1,
  start_date, end_date
});

const runs = (date: string): CalendarDate => ({service_id: 1, date, exception_type: 1});

describe("createFeedInfo", () => {

  it("says the feed covers the build window, not the span of its calendars", () => {
    // A schedule that began in 2021 and still runs carries its real start date,
    // and the feed does not describe 2021: services that had ended before the
    // build date were never queried for.
    const info = createFeedInfo([calendar("20210301", "20991231")], [], range, "RJTTF001.ZIP");

    expect([info.feed_start_date, info.feed_end_date]).to.deep.equal(["20240101", "20240401"]);
  });

  it("pulls the end in when the data runs out before the window does", () => {
    const info = createFeedInfo([calendar("20240101", "20240210"), calendar("20240101", "20240301")], [], range, null);

    expect(info.feed_end_date).to.equal("20240301");
  });

  it("counts a day a calendar_dates entry adds as covered", () => {
    const info = createFeedInfo([calendar("20240101", "20240210")], [runs("20240220")], range, null);

    expect(info.feed_end_date).to.equal("20240220");
  });

  it("does not count a day taken away as covered", () => {
    const removed = {...runs("20240220"), exception_type: 2};
    const info = createFeedInfo([calendar("20240101", "20240210")], [removed], range, null);

    expect(info.feed_end_date).to.equal("20240210");
  });

  it("publishes the source file as the version, and says nothing where there is none", () => {
    expect(createFeedInfo([], [], range, "RJTTF001.ZIP").feed_version).to.equal("RJTTF001.ZIP");
    expect(createFeedInfo([], [], range, null).feed_version).to.equal(null);
  });

  it("names the publisher and the language", () => {
    const info = createFeedInfo([], [], range, null);

    expect(info.feed_publisher_name).to.equal("Planar Network");
    expect(info.feed_publisher_url).to.match(/^https:\/\//);
    expect(info.feed_lang).to.equal("en");
  });

});
