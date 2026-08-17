import {describe, it, expect} from 'vitest';
import {compare, dayOfWeek, maxDate, minDate, toYYYYMMDD} from "../model/PlainDate";

const date = (value: string) => Temporal.PlainDate.from(value);

describe("PlainDate", () => {

  it("maps every ISO day onto a Sunday-first index", () => {
    // 2017-07-09 is a Sunday, so this walks a full week
    expect(dayOfWeek(date("2017-07-09"))).to.equal(0);
    expect(dayOfWeek(date("2017-07-10"))).to.equal(1);
    expect(dayOfWeek(date("2017-07-11"))).to.equal(2);
    expect(dayOfWeek(date("2017-07-12"))).to.equal(3);
    expect(dayOfWeek(date("2017-07-13"))).to.equal(4);
    expect(dayOfWeek(date("2017-07-14"))).to.equal(5);
    expect(dayOfWeek(date("2017-07-15"))).to.equal(6);
  });

  it("wraps back round to Sunday", () => {
    expect(dayOfWeek(date("2017-07-16"))).to.equal(0);
  });

  it("compares dates", () => {
    expect(compare(date("2017-01-01"), date("2017-01-02"))).to.be.lessThan(0);
    expect(compare(date("2017-01-02"), date("2017-01-01"))).to.be.greaterThan(0);
    expect(compare(date("2017-01-01"), date("2017-01-01"))).to.equal(0);
  });

  it("takes the later of two dates", () => {
    expect(maxDate(date("2017-01-01"), date("2017-01-02")).toString()).to.equal("2017-01-02");
    expect(maxDate(date("2017-01-02"), date("2017-01-01")).toString()).to.equal("2017-01-02");
  });

  it("takes the earlier of two dates", () => {
    expect(minDate(date("2017-01-01"), date("2017-01-02")).toString()).to.equal("2017-01-01");
    expect(minDate(date("2017-01-02"), date("2017-01-01")).toString()).to.equal("2017-01-01");
  });

  it("returns the first date when they are equal", () => {
    const first = date("2017-01-01");

    expect(maxDate(first, date("2017-01-01"))).to.equal(first);
    expect(minDate(first, date("2017-01-01"))).to.equal(first);
  });

  it("formats as YYYYMMDD", () => {
    expect(toYYYYMMDD(date("2017-07-09"))).to.equal("20170709");
    expect(toYYYYMMDD(date("2017-12-25"))).to.equal("20171225");
    expect(toYYYYMMDD(date("0999-01-02"))).to.equal("09990102");
  });

});
