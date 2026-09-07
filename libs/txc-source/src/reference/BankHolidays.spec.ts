import { LocalDate } from "@js-joda/core";
import { getBankHolidaysForRange } from "../../src/reference/BankHolidays";
import { Holiday } from "../../src/transxchange/TransXChange";

describe("BankHolidays", () => {
  const dates = getBankHolidaysForRange(2020, 2026);

  const has = (key: Holiday, iso: string) =>
    dates[key].some(d => d.equals(LocalDate.parse(iso)));

  it("Scottish August bank holiday is the first Monday of August (fixes #22)", () => {
    expect(has(Holiday.AugustBankHolidayScotland, "2024-08-05")).to.equal(true);
    expect(has(Holiday.AugustBankHolidayScotland, "2024-08-26")).to.equal(false);
    expect(has(Holiday.AugustBankHolidayScotland, "2025-08-04")).to.equal(true);
  });

  it("English late summer bank holiday is the last Monday of August", () => {
    expect(has(Holiday.LateSummerBankHolidayNotScotland, "2024-08-26")).to.equal(true);
    expect(has(Holiday.LateSummerBankHolidayNotScotland, "2025-08-25")).to.equal(true);
  });

  it("resolves Easter-based holidays", () => {
    expect(has(Holiday.GoodFriday, "2024-03-29")).to.equal(true);
    expect(has(Holiday.EasterMonday, "2024-04-01")).to.equal(true);
  });

  it("SpringBank is the first Monday of May; MayDay is the Spring bank holiday (late May)", () => {
    expect(has(Holiday.SpringBank, "2024-05-06")).to.equal(true);
    expect(has(Holiday.SpringBank, "2023-05-01")).to.equal(true);
    expect(has(Holiday.MayDay, "2024-05-27")).to.equal(true);
  });

  it("picks up the Platinum Jubilee move of the 2022 Spring bank holiday", () => {
    expect(has(Holiday.MayDay, "2022-06-02")).to.equal(true);
    expect(has(Holiday.MayDay, "2022-05-30")).to.equal(false);
  });

  it("emits substitute days when Christmas/Boxing Day fall on a weekend", () => {
    expect(has(Holiday.ChristmasDayHoliday, "2022-12-27")).to.equal(true);
    expect(has(Holiday.BoxingDayHoliday, "2021-12-28")).to.equal(true);
    expect(has(Holiday.BoxingDayHoliday, "2020-12-28")).to.equal(true);
  });

  it("keeps fixed-date holidays separate from their substitutes", () => {
    expect(has(Holiday.ChristmasDay, "2022-12-25")).to.equal(true);
    expect(has(Holiday.ChristmasDay, "2022-12-27")).to.equal(false);
    expect(has(Holiday.BoxingDay, "2022-12-26")).to.equal(true);
  });

  it("populates the Scottish new year holidays", () => {
    expect(has(Holiday.Jan2ndScotland, "2024-01-02")).to.equal(true);
    expect(has(Holiday.Jan2ndHoliday, "2022-01-03")).to.equal(true);
  });

  it("synthesizes Christmas Eve and New Year's Eve for each year in the range", () => {
    expect(has(Holiday.ChristmasEve, "2024-12-24")).to.equal(true);
    expect(has(Holiday.NewYearsEve, "2024-12-31")).to.equal(true);
  });

  it("AllBankHolidays is the union of the England/Wales set", () => {
    expect(has(Holiday.AllBankHolidays, "2024-08-26")).to.equal(true);
    expect(has(Holiday.AllBankHolidays, "2024-03-29")).to.equal(true);
    expect(has(Holiday.AllBankHolidays, "2024-08-05")).to.equal(false);
    expect(has(Holiday.AllBankHolidays, "2024-01-02")).to.equal(false);
  });

  it("excludes date-holidays one-off entries that map to no TXC enum", () => {
    const allDates = new Set(
      Object.values(Holiday).flatMap(h => dates[h].map(d => d.toString()))
    );
    expect(allDates.has("2022-06-03")).to.equal(false);
    expect(allDates.has("2023-05-08")).to.equal(false);
  });
});
