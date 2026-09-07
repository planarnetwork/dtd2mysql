import {describe, it, expect} from "vitest";
import {CalendarFactory} from "./CalendarFactory";

describe("CalendarFactory", () => {
  const factory = new CalendarFactory();

  it("sets the start and end date", () => {
    const dates = [
      { service_id: 1, exception_type: 1, date: "20190615" },
      { service_id: 1, exception_type: 1, date: "20190515" },
      { service_id: 1, exception_type: 1, date: "20190520" }
    ];

    const [calendar] = factory.create("1", dates);

    expect(calendar.start_date).to.deep.equal("20190515");
    expect(calendar.end_date).to.deep.equal("20190615");
  });

  it("does not enable days where the service is not running", () => {
    const dates = [
      { service_id: 1, exception_type: 1, date: "20190615" },
      { service_id: 1, exception_type: 1, date: "20190515" },
      { service_id: 1, exception_type: 1, date: "20190522" },
      { service_id: 1, exception_type: 1, date: "20190529" },
      { service_id: 1, exception_type: 1, date: "20190605" },
      { service_id: 1, exception_type: 1, date: "20190520" }
    ];

    const [calendar] = factory.create("1", dates);

    expect(calendar.monday).to.deep.equal(0);
    expect(calendar.tuesday).to.deep.equal(0);
    expect(calendar.wednesday).to.deep.equal(1);
    expect(calendar.thursday).to.deep.equal(0);
    expect(calendar.friday).to.deep.equal(0);
    expect(calendar.saturday).to.deep.equal(0);
    expect(calendar.sunday).to.deep.equal(0);
  });

  it("adds exception days", () => {
    const dates = [
      { service_id: 1, exception_type: 1, date: "20190615" },
      { service_id: 1, exception_type: 1, date: "20190515" },
      { service_id: 1, exception_type: 1, date: "20190522" },
      { service_id: 1, exception_type: 1, date: "20190529" },
      { service_id: 1, exception_type: 1, date: "20190605" },
      { service_id: 1, exception_type: 1, date: "20190520" }
    ];

    const [calendar, calendarDates] = factory.create("1", dates);

    expect(calendarDates[0].date).to.deep.equal("20190520");
    expect(calendarDates[1].date).to.deep.equal("20190612");
    expect(calendarDates[2].date).to.deep.equal("20190615");
  });

});
