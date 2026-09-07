import {awaitStream, splitCSV} from "../util";
import {AgencyStream} from "../../src/gtfs/AgencyStream";


describe("AgencyStream", () => {

  it("emits operators", async () => {
    const stream = new AgencyStream();

    stream.write({
      Operators: {
        ID: {
          OperatorCode: "Code",
          OperatorShortName: "Name",
          OperatorNameOnLicence: undefined
        }
      }
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const [agency_id, agency_name, agency_url, agency_timezone, agency_lang] = splitCSV(rows[1]);

      expect(agency_id).to.equal("ID");
      expect(agency_name).to.equal("Name");
      expect(agency_url).to.equal("http://agency.com");
      expect(agency_timezone).to.equal("Europe/London");
      expect(agency_lang).to.equal("en");
    });
  });

  it("uses env vars if they are set", async () => {
    process.env.AGENCY_URL = "http://example.org";
    process.env.AGENCY_TIMEZONE = "Portugal/Lisbon";
    process.env.AGENCY_LANG = "pt";

    const stream = new AgencyStream();

    stream.write({
      Operators: {
        ID: {
          OperatorCode: "Code",
          OperatorShortName: "Name",
          OperatorNameOnLicence: undefined
        }
      }
    });

    stream.end();

    return awaitStream(stream, (rows: string[]) => {
      const [agency_id, agency_name, agency_url, agency_timezone, agency_lang] = splitCSV(rows[1]);

      expect(agency_id).to.equal("ID");
      expect(agency_name).to.equal("Name");
      expect(agency_url).to.equal("http://example.org");
      expect(agency_timezone).to.equal("Portugal/Lisbon");
      expect(agency_lang).to.equal("pt");
    });
  });
});

