import Holidays, { HolidaysTypes } from "date-holidays";
import { LocalDate } from "@js-joda/core";
import { Holiday } from "../transxchange/TransXChange";
import type { BankHolidays } from "../transxchange/TransXChangeJourneyStream";

type Locale = "ENG" | "SCT";

interface Rule {
  locale: Locale;
  match: (h: HolidaysTypes.Holiday) => boolean;
}

const MAPPING: Partial<Record<Holiday, Rule>> = {
  [Holiday.NewYearsDay]:                      { locale: "ENG", match: h => h.rule === "01-01" && !h.substitute },
  [Holiday.NewYearsDayHoliday]:               { locale: "ENG", match: h => h.rule.startsWith("substitutes 01-01") },
  [Holiday.Jan2ndScotland]:                   { locale: "SCT", match: h => h.rule === "01-02" && !h.substitute },
  [Holiday.Jan2ndHoliday]:                    { locale: "SCT", match: h => h.rule.startsWith("substitutes 01-02") },
  [Holiday.GoodFriday]:                       { locale: "ENG", match: h => h.rule === "easter -2" },
  [Holiday.EasterMonday]:                     { locale: "ENG", match: h => h.rule === "easter 1" },
  [Holiday.SpringBank]:                       { locale: "ENG", match: h => h.rule === "1st monday in May" },
  [Holiday.MayDay]:                           { locale: "ENG", match: h => h.rule === "1st monday before 06-01" },
  [Holiday.LateSummerBankHolidayNotScotland]: { locale: "ENG", match: h => h.rule === "1st monday before 09-01" },
  [Holiday.AugustBankHolidayScotland]:        { locale: "SCT", match: h => h.rule === "1st monday in August" },
  [Holiday.ChristmasDay]:                     { locale: "ENG", match: h => h.rule === "12-25" && !h.substitute },
  [Holiday.ChristmasDayHoliday]:              { locale: "ENG", match: h => h.rule.startsWith("substitutes 12-25") },
  [Holiday.BoxingDay]:                        { locale: "ENG", match: h => h.rule === "12-26" && !h.substitute },
  [Holiday.BoxingDayHoliday]:                 { locale: "ENG", match: h => h.rule.startsWith("substitutes 12-26") },
};

const ALL_BANK_HOLIDAY_KEYS: Holiday[] = [
  Holiday.NewYearsDayHoliday,
  Holiday.GoodFriday,
  Holiday.EasterMonday,
  Holiday.SpringBank,
  Holiday.MayDay,
  Holiday.LateSummerBankHolidayNotScotland,
  Holiday.ChristmasDayHoliday,
  Holiday.BoxingDayHoliday,
];

export function getBankHolidays(): BankHolidays {
  const currentYear = new Date().getFullYear();
  return getBankHolidaysForRange(currentYear - 10, currentYear + 20);
}

export function getBankHolidaysForRange(fromYear: number, toYear: number): BankHolidays {
  const holidaysByLocale: Record<Locale, HolidaysTypes.Holiday[]> = {
    ENG: collect(new Holidays("GB", "ENG"), fromYear, toYear),
    SCT: collect(new Holidays("GB", "SCT"), fromYear, toYear),
  };

  const result = Object.values(Holiday).reduce((acc, h) => {
    acc[h] = [];
    return acc;
  }, {} as BankHolidays);

  for (const [key, rule] of Object.entries(MAPPING) as [Holiday, Rule][]) {
    result[key] = holidaysByLocale[rule.locale].filter(rule.match).map(toLocalDate);
  }

  for (let year = fromYear; year <= toYear; year++) {
    result[Holiday.ChristmasEve].push(LocalDate.parse(`${year}-12-24`));
    result[Holiday.NewYearsEve].push(LocalDate.parse(`${year}-12-31`));
  }

  result[Holiday.AllBankHolidays] = ALL_BANK_HOLIDAY_KEYS.flatMap(key => result[key]);

  return result;
}

function collect(hd: Holidays, fromYear: number, toYear: number): HolidaysTypes.Holiday[] {
  const out: HolidaysTypes.Holiday[] = [];
  for (let year = fromYear; year <= toYear; year++) {
    out.push(...hd.getHolidays(year));
  }
  return out;
}

function toLocalDate(h: HolidaysTypes.Holiday): LocalDate {
  return LocalDate.parse(h.date.substring(0, 10));
}
