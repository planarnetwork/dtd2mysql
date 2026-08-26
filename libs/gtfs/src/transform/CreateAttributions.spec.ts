import {describe, it, expect} from "vitest";
import {TIMETABLE_ATTRIBUTION, createAttributions} from "./CreateAttributions";
import {Attribution} from "../enrich/Enricher";

const naptan: Attribution = {
  organisation: "Department for Transport",
  licence: "Open Government Licence v3.0",
  url: "https://naptan.dft.gov.uk",
  shareAlike: false
};

describe("createAttributions", () => {

  it("credits a source under the terms it declared", () => {
    expect(createAttributions([naptan])).to.deep.equal([{
      organization_name: "Department for Transport",
      is_producer: 0,
      is_operator: 0,
      is_authority: 1,
      attribution_url: "https://naptan.dft.gov.uk",
      attribution_licence: "Open Government Licence v3.0"
    }]);
  });

  // The spec has organization_name and a URL and no field for the terms, which
  // is the one thing an attribution statement has to say.
  it("carries the licence, which the spec has nowhere for", () => {
    expect(createAttributions([naptan])[0].attribution_licence)
      .to.equal("Open Government Licence v3.0");
  });

  // NaPTAN's stops and NaPTAN's platforms are both the DfT under the same
  // terms. Two rows would say the feed has two sources when it has one.
  it("credits one organisation once per licence", () => {
    const rows = createAttributions([naptan, {...naptan, url: "https://example.com"}]);

    expect(rows).to.have.length(1);
  });

  it("credits the same organisation twice when the terms differ", () => {
    const rows = createAttributions([naptan, {...naptan, licence: "ODbL"}]);

    expect(rows.map(r => r.attribution_licence)).to.deep.equal([
      "Open Government Licence v3.0", "ODbL"
    ]);
  });

  // The spec requires at least one of the three roles, and a source is the
  // authority for its own data unless it says otherwise.
  it("makes a source the authority by default", () => {
    const [row] = createAttributions([naptan]);

    expect([row.is_producer, row.is_operator, row.is_authority]).to.deep.equal([0, 0, 1]);
  });

  it("takes a role the source declares", () => {
    const [row] = createAttributions([{...naptan, role: "operator"}]);

    expect([row.is_producer, row.is_operator, row.is_authority]).to.deep.equal([0, 1, 0]);
  });

  it("leaves the url null rather than empty when a source has none", () => {
    const {url, ...withoutUrl} = naptan;

    expect(createAttributions([withoutUrl])[0].attribution_url).to.equal(null);
  });

  it("credits the timetable, which is not an enricher and so declares nothing", () => {
    expect(createAttributions([TIMETABLE_ATTRIBUTION])[0].organization_name)
      .to.equal("Rail Delivery Group");
  });

  it("has something to write even when nothing is configured", () => {
    expect(createAttributions([TIMETABLE_ATTRIBUTION])).to.have.length(1);
  });

  // Two declarations of one source can disagree about its URL. Taking the last
  // would make the published credit depend on the order enrichers were listed
  // in, which is how a feed ends up crediting a retired portal.
  it("keeps the first declaration when two describe the same source", () => {
    const rows = createAttributions([
      TIMETABLE_ATTRIBUTION,
      {...TIMETABLE_ATTRIBUTION, url: "https://data.atoc.org/"}
    ]);

    expect(rows).to.have.length(1);
    expect(rows[0].attribution_url).to.equal("https://raildata.org.uk/");
  });

  it("is the same feed whichever order the sources were configured in", () => {
    const forwards = createAttributions([TIMETABLE_ATTRIBUTION, naptan]);
    const backwards = createAttributions([naptan, TIMETABLE_ATTRIBUTION]);

    expect(new Set(forwards.map(r => r.organization_name)))
      .to.deep.equal(new Set(backwards.map(r => r.organization_name)));
  });

});
