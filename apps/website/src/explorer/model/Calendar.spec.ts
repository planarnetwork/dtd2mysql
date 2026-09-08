import {describe, it, expect} from "vitest";
import {zipSync} from "fflate";
import {ADDED, Calendars, REMOVED, feedWindow} from "./Calendar.js";
import {openFeed} from "./OpenFeed.js";
import {goldenFeed} from "../test/golden.js";

const feed = goldenFeed();

/** Built through openFeed so the stores under test are the ones the explorer really uses. */
async function calendars(calendar: string, dates = "service_id,date,exception_type\n") {
  const encoder = new TextEncoder();
  const index = await openFeed("test.zip", zipSync({
    "calendar.txt": encoder.encode(calendar),
    "calendar_dates.txt": encoder.encode(dates)
  }));

  return new Calendars(index.files.get("calendar.txt"), index.files.get("calendar_dates.txt"));
}

const HEADER = "service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\n";

describe("Calendars", () => {

  it("runs on a weekday the pattern names, within the window", () => {
    // 20260810 is a Monday.
    return calendars(HEADER + "1,1,0,0,0,0,0,0,20260810,20260817\n").then(c => {
      expect(c.runsOn("1", 20260810)).to.equal(true);
      expect(c.runsOn("1", 20260811)).to.equal(false); // Tuesday
      expect(c.runsOn("1", 20260817)).to.equal(true);  // the following Monday, the last day
      expect(c.runsOn("1", 20260824)).to.equal(false); // past the end
      expect(c.runsOn("1", 20260803)).to.equal(false); // before the start
    });
  });

  it("lets a removal beat the weekday pattern, and says it was a removal", () => {
    // The overlay case: an STP schedule replacing part of a permanent one becomes exclusions on the
    // permanent trip. "Why does this train not run on Tuesday" is answered here or nowhere.
    return calendars(
      HEADER + "1,1,0,0,0,0,0,0,20260810,20260831\n",
      "service_id,date,exception_type\n1,20260817,2\n"
    ).then(c => {
      expect(c.runsOn("1", 20260810)).to.equal(true);
      expect(c.runsOn("1", 20260817)).to.equal(false);
      expect(c.exceptionOn("1", 20260817)).to.equal(REMOVED);
      expect(c.exceptionOn("1", 20260810)).to.equal(undefined);
    });
  });

  it("lets an addition beat the weekday pattern", () => {
    return calendars(
      HEADER + "1,1,0,0,0,0,0,0,20260810,20260831\n",
      "service_id,date,exception_type\n1,20260811,1\n"
    ).then(c => {
      expect(c.runsOn("1", 20260811)).to.equal(true);
      expect(c.exceptionOn("1", 20260811)).to.equal(ADDED);
    });
  });

  it("knows a service named only by its exceptions", () => {
    // Legal GTFS, and without it such a service looks like a trip with no calendar at all.
    return calendars(HEADER, "service_id,date,exception_type\n9,20260812,1\n").then(c => {
      expect(c.has("9")).to.equal(true);
      expect(c.runsOn("9", 20260812)).to.equal(true);
      expect(c.runsOn("9", 20260813)).to.equal(false);
    });
  });

  it("expands a window a day at a time, marking the exceptions", () => {
    return calendars(
      HEADER + "1,1,1,1,1,1,1,1,20260810,20260812\n",
      "service_id,date,exception_type\n1,20260811,2\n"
    ).then(c => {
      expect(c.dates("1", 20260810, 20260812)).to.deep.equal([
        {date: 20260810, runs: true, exception: undefined},
        {date: 20260811, runs: false, exception: REMOVED},
        {date: 20260812, runs: true, exception: undefined}
      ]);
    });
  });

  it("crosses a month end when it expands", () => {
    return calendars(HEADER + "1,1,1,1,1,1,1,1,20260830,20260902\n").then(c => {
      expect(c.dates("1", 20260830, 20260902).map(d => d.date))
        .to.deep.equal([20260830, 20260831, 20260901, 20260902]);
    });
  });

  it("answers for a date far outside the feed window without expanding to it", () => {
    // 23 services in the real feed run to 2099. Expanding twenty seven thousand days to find out is
    // not an answer.
    return calendars(HEADER + "1,1,0,0,0,0,0,0,20260810,20991231\n").then(c => {
      expect(c.runsOn("1", 20990105)).to.equal(true);  // a Monday
      expect(c.runsOn("1", 20990104)).to.equal(false); // the Sunday before it
    });
  });

  it("says a service it has never heard of does not run", () => {
    return calendars(HEADER + "1,1,0,0,0,0,0,0,20260810,20260817\n").then(c => {
      expect(c.has("nothing")).to.equal(false);
      expect(c.runsOn("nothing", 20260810)).to.equal(false);
    });
  });

});

describe("the golden feed's calendars", () => {

  it("reads every service the feed declares", async () => {
    const index = await openFeed("golden.zip", feed);
    const c = new Calendars(index.files.get("calendar.txt"), index.files.get("calendar_dates.txt"));

    expect(c.ids.length).to.equal(59);
  });

  it("takes its window from feed_info, a day either side", async () => {
    // A day either side because a train departing at 24:35 belongs to the previous service day.
    const index = await openFeed("golden.zip", feed);

    expect(feedWindow(index)).to.deep.equal({from: 20260809, to: 20261111});
  });

});
