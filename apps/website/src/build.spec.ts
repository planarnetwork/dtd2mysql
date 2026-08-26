import {describe, it, expect} from "vitest";
import {FeedMeta, sources} from "./build";

const feed = (extra: Partial<FeedMeta> = {}): FeedMeta => ({
  built: "2026-08-27T05:00:00.000Z",
  commit: "abc1234",
  trips: 276000,
  feed_version: "RJTTF918.ZIP",
  feed_start_date: "20260827",
  feed_end_date: "20261127",
  ...extra
});

describe("sources", () => {

  // NaPTAN is OGL v3.0, which makes acknowledgement a condition of use. A page
  // that lists the timetable and not the DfT is the page failing at the one job
  // this section has.
  it("credits every source the feed was built from", () => {
    const html = sources(feed({sources: [
      {organisation: "Rail Delivery Group", licence: "Rail Settlement Plan data licence"},
      {organisation: "Department for Transport", licence: "Open Government Licence v3.0", url: "https://naptan.dft.gov.uk"}
    ]}));

    expect(html).to.contain("Department for Transport");
    expect(html).to.contain("Open Government Licence v3.0");
    expect(html).to.contain("Rail Delivery Group");
  });

  it("links a licence the source gave a url for", () => {
    const html = sources(feed({sources: [
      {organisation: "DfT", licence: "OGL v3.0", url: "https://naptan.dft.gov.uk"}
    ]}));

    expect(html).to.contain('<a href="https://naptan.dft.gov.uk">OGL v3.0</a>');
  });

  it("states a licence with no url as text", () => {
    const html = sources(feed({sources: [{organisation: "DfT", licence: "OGL v3.0"}]}));

    expect(html).to.contain("<dd>OGL v3.0</dd>");
  });

  // Releases published before the build declared its sources have none, and an
  // empty list would read as a feed built from nothing.
  it("names the timetable when a release predates the source list", () => {
    expect(sources(feed())).to.contain("Rail Delivery Group");
    expect(sources(feed({sources: []}))).to.contain("Rail Delivery Group");
  });

  it("says the same when there is no feed at all", () => {
    expect(sources(undefined)).to.contain("Rail Delivery Group");
  });

  // The names come from a feed built out of external data, so they reach the
  // page as content rather than as markup.
  it("escapes what it puts in the page", () => {
    const html = sources(feed({sources: [
      {organisation: "<script>alert(1)</script>", licence: "A & B"}
    ]}));

    expect(html).to.not.contain("<script>");
    expect(html).to.contain("&lt;script&gt;");
    expect(html).to.contain("A &amp; B");
  });

});
