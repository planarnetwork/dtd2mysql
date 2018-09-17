import {ParseXML, XMLStream} from "./xml/XMLStream";
import {promisify} from "util";
import {parseString} from "xml2js";
import {Converter} from "./converter/Converter";
import {StopsStream} from "./gtfs/StopsStream";
import parse = require("csv-parse");
import {NaPTANFactory} from "./reference/NaPTAN";
import AdmZip = require("adm-zip");
import {TransXChangeStream} from "./transxchange/TransXChangeStream";
import {FileStream} from "./converter/FileStream";
import {AgencyStream} from "./gtfs/AgencyStream";

/**
 * Dependency container
 */
export class Container {

  public async getConverter(): Promise<Converter> {
    const stopsStream = await this.getStopsStream();

    return new Converter(
      new FileStream(),
      new XMLStream(this.getParseXML()),
      new TransXChangeStream(),
      {
        "stops.txt": stopsStream,
        "agency.txt": new AgencyStream()
      },
      new AdmZip()
    );
  }

  public async getStopsStream(): Promise<StopsStream> {
    const naptanFactory = new NaPTANFactory(
      new AdmZip(__dirname + "/../resource/Stops.zip"),
      parse()
    );

    const naptanIndex = await naptanFactory.getIndex();

    return new StopsStream(naptanIndex);
  }

  public getParseXML(): ParseXML {
    return promisify(parseString as any);
  }

}