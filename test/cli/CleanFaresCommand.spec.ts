import {describe, it, expect} from 'vitest';
import {getFirstDateAfter, startOfYear} from "../../src/cli/CleanFaresCommand";

const date = (value: string) => Temporal.PlainDate.from(value);

describe("CleanFaresCommand", () => {

  describe("startOfYear", () => {

    it("takes the 1st of January of the given year", () => {
      expect(startOfYear("2017-06-30").toString()).to.equal("2017-01-01");
      expect(startOfYear("2017-01-01").toString()).to.equal("2017-01-01");
    });

    it("does not overflow when the day of month is not valid in January", () => {
      expect(startOfYear("2017-02-28").toString()).to.equal("2017-01-01");
    });

  });

  describe("getFirstDateAfter", () => {

    it("finds the restriction month later in the same year", () => {
      expect(getFirstDateAfter(date("2017-01-01"), "0301")?.toString()).to.equal("2017-03-01");
    });

    it("rolls into the next year when the restriction month has passed", () => {
      expect(getFirstDateAfter(date("2017-06-01"), "0301")?.toString()).to.equal("2018-03-01");
    });

    it("treats the same day as not having passed", () => {
      expect(getFirstDateAfter(date("2017-03-01"), "0301")?.toString()).to.equal("2017-03-01");
    });

    it("rolls over when the day of month has passed within the same month", () => {
      expect(getFirstDateAfter(date("2017-03-02"), "0301")?.toString()).to.equal("2018-03-01");
    });

    it("returns undefined for a date that does not exist in the target year", () => {
      // 2017 is not a leap year
      expect(getFirstDateAfter(date("2017-01-01"), "0229")).to.be.undefined;
    });

    it("finds the leap day when the target year has one", () => {
      expect(getFirstDateAfter(date("2016-01-01"), "0229")?.toString()).to.equal("2016-02-29");
    });

    it("returns undefined for a malformed restriction month", () => {
      expect(getFirstDateAfter(date("2017-01-01"), "0000")).to.be.undefined;
      expect(getFirstDateAfter(date("2017-01-01"), "1350")).to.be.undefined;
    });

  });

});
