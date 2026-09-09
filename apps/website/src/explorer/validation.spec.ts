import {describe, it, expect} from "vitest";
import {counts, groups, readReport, refsOf} from "./validation.js";
import type {Baseline, Report} from "./validation.js";

/**
 * A slice of a real report, because the shape is the thing under test. Each notice type carries
 * whatever fields it needs and the validator publishes no schema for them, so a hand-simplified
 * sample would be testing a shape that does not occur.
 */
const REPORT: Report = {
  notices: [
    {
      code: "unknown_column",
      severity: "INFO",
      totalNotices: 12,
      sampleNotices: [{filename: "transfers.txt", fieldName: "mode", index: 6}]
    },
    {
      code: "point_near_origin",
      severity: "ERROR",
      totalNotices: 2,
      sampleNotices: [
        {filename: "stops.txt", csvRowNumber: 4213, entityId: "910GCATZQBN",
          stopId: "910GCATZQBN", latFieldName: "stop_lat", latFieldValue: 0},
        {filename: "stops.txt", csvRowNumber: 4214, entityId: "910GCATZQBS",
          stopId: "910GCATZQBS", latFieldName: "stop_lat", latFieldValue: 0}
      ]
    },
    {
      code: "stop_time_with_arrival_before_previous_departure_time",
      severity: "ERROR",
      totalNotices: 1,
      sampleNotices: [{tripId: "Z03536_20260213_20261231", csvRowNumber: 2990745,
        filename: "stop_times.txt", prevCsvRowNumber: 2990744}]
    },
    {
      code: "missing_recommended_field",
      severity: "WARNING",
      totalNotices: 5241,
      sampleNotices: [{filename: "routes.txt", csvRowNumber: 2, fieldName: "route_desc"}]
    }
  ]
};

const BASELINE: Baseline = {
  point_near_origin: {
    max: 2,
    why: "B10: QBN and QBS have no coordinate and are published at 0,0 so a validator flags them."
  },
  stop_time_with_arrival_before_previous_departure_time: {
    max: 1,
    why: "B24: the source has this train arriving before it left."
  }
};

describe("groups", () => {

  it("puts the errors first, and the biggest of them at the top", () => {
    expect(groups(REPORT, BASELINE).map(group => group.code)).to.deep.equal([
      "point_near_origin",
      "stop_time_with_arrival_before_previous_departure_time",
      "missing_recommended_field",
      "unknown_column"
    ]);
  });

  it("carries the reason the build accepts a code, so a decision does not read as a failure", () => {
    const accepted = groups(REPORT, BASELINE).find(group => group.code === "point_near_origin");

    expect(accepted?.accepted?.max).to.equal(2);
    expect(accepted?.accepted?.why).to.contain("so a validator flags them");
  });

  it("leaves a code the baseline does not name unaccepted", () => {
    expect(groups(REPORT, BASELINE).find(group => group.code === "unknown_column")?.accepted)
      .to.equal(undefined);
  });

  it("says how many the report holds as well as how many there are", () => {
    // The report samples rather than listing everything, and a page that showed 1 of 5,241 without
    // saying so would be understating the problem by three orders of magnitude.
    const group = groups(REPORT, BASELINE).find(g => g.code === "missing_recommended_field");

    expect(group?.total).to.equal(5241);
    expect(group?.shown).to.equal(1);
  });

});

describe("refsOf", () => {

  it("finds the stop a notice is about", () => {
    expect(refsOf({stopId: "910GCATZQBN"})).to.deep.contain({kind: "stop", id: "910GCATZQBN"});
  });

  it("finds the trip a notice is about", () => {
    expect(refsOf({tripId: "Z03536"})).to.deep.contain({kind: "trip", id: "Z03536"});
  });

  it("finds both ends of a transfer", () => {
    expect(refsOf({fromStopId: "A", toStopId: "B"})).to.deep.equal([
      {kind: "stop", id: "A"},
      {kind: "stop", id: "B"}
    ]);
  });

  it("turns a file and a row number into the exact row", () => {
    // csvRowNumber counts the header, and the explorer indexes from the first data row.
    expect(refsOf({filename: "stop_times.txt", csvRowNumber: 2990745}))
      .to.deep.equal([{kind: "row", file: "stop_times.txt", row: 2990743}]);
  });

  it("ignores a row number with no file beside it", () => {
    expect(refsOf({csvRowNumber: 42})).to.deep.equal([]);
  });

  it("finds nothing in a notice that names nothing", () => {
    expect(refsOf({fieldName: "route_desc", index: 3})).to.deep.equal([]);
  });

});

describe("counts", () => {

  it("keeps an accepted error out of the error count", () => {
    // Both of this report's errors are accepted, so a feed that passes its own gate reads as
    // passing rather than as three errors.
    expect(counts(groups(REPORT, BASELINE))).to.deep.equal({
      errors: 0,
      warnings: 5241,
      accepted: 3
    });
  });

  it("counts an error the baseline does not name", () => {
    expect(counts(groups(REPORT, {})).errors).to.equal(3);
  });

});

describe("readReport", () => {

  it("takes a report", () => {
    expect(readReport(REPORT)).to.equal(REPORT);
  });

  it("refuses anything else, so the view says the release carried none", () => {
    expect(readReport(undefined)).to.equal(undefined);
    expect(readReport({})).to.equal(undefined);
    expect(readReport("not a report")).to.equal(undefined);
  });

});
