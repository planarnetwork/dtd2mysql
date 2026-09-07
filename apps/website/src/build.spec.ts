import {describe, it, expect} from "vitest";
import {FeedMeta, fill, guide, render, sources} from "./build";

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

describe("fill", () => {

  it("puts what the feed says into the page", () => {
    const html = fill("<div>{{summary}}</div>", feed());

    expect(html).to.contain("276,000");
    expect(html).to.contain("RJTTF918.ZIP");
  });

  // The guide is published whether or not a feed is, so a token has to have
  // something to say when there is nothing to describe.
  it("says there are no figures rather than leaving a gap", () => {
    expect(fill("<div>{{summary}}</div>", undefined)).to.contain("No feed has been published yet");
  });

  // feed_version is a filename from an external feed, and it reaches the page
  // after the markdown parser has run, so escape() is the only thing between it
  // and the page.
  it("escapes what the feed supplies", () => {
    const html = fill("<div>{{summary}}</div>", feed({feed_version: "<script>alert(1)</script>"}));

    expect(html).to.not.contain("<script>");
    expect(html).to.contain("&lt;script&gt;");
  });

  // A token in a link destination is a URL as far as marked is concerned, so it
  // has to be substituted before the markdown is rendered or it arrives percent
  // encoded and the link is broken.
  it("resolves a token a link is built from", () => {
    const html = fill("[the feed]({{download}})", feed());

    expect(html).to.contain('href="https://github.com/planarnetwork/dtd2mysql/releases/latest/download/gtfs.zip"');
  });

  it("refuses an encoded token as well as a plain one", () => {
    expect(() => fill("[the feed]({{nothing}})", feed())).to.throw("is not a token this understands");
  });

  // A page that publishes {{trips}} to the world is worse than a page that does
  // not deploy, so an unknown token stops the build rather than reaching it.
  it("refuses a token nothing supplies", () => {
    expect(() => fill("<p>{{trips}}</p>", feed())).to.throw("{{trips}}");
  });

  it("refuses a token it cannot even read", () => {
    expect(() => fill("<p>{{ summary }}</p>", feed())).to.throw("would have been published");
  });

});

describe("render", () => {

  // The contents at the top of the guide link to the sections below it, and
  // marked gives a heading no id to link to.
  it("gives every section an id to link to", () => {
    expect(render("## Splits and joins\n")).to.contain('<h2 id="splits-and-joins">');
  });

  // A table wider than the screen has to scroll inside its own box rather than
  // taking the page with it.
  it("wraps a table so it scrolls on its own", () => {
    const html = render("| a | b |\n|---|---|\n| 1 | 2 |\n");

    expect(html).to.contain('<div class="scroll"><table>');
    expect(html).to.contain("</table></div>");
  });

});

describe("guide", () => {

  it("renders the markdown it is written in", () => {
    expect(guide(feed())).to.contain('<h2 id="identifiers">Identifiers</h2>');
  });

  it("resolves every token it uses", () => {
    expect(guide(feed())).to.not.contain("{{");
  });

  // A link to a section that no longer exists is silent: the page loads and the
  // link does nothing.
  it("links only to sections it contains", () => {
    const html = guide(feed());
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
    const links = [...html.matchAll(/href="#([^"]+)"/g)].map(match => match[1]);

    expect(links.length).to.be.greaterThan(0);
    expect(links.filter(link => !ids.includes(link))).to.deep.equal([]);
  });

});
