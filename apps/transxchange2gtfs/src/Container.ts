import {ParseXML, XMLStream} from "./xml/XMLStream";
import {promisify} from "util";
import {parseString} from "xml2js";
import {Converter} from "./converter/Converter";
import {StopsStream} from "./gtfs/StopsStream";
import parse = require("csv-parse");
import {NaPTANFactory} from "./reference/NaPTAN";
import AdmZip = require("adm-zip");
import {TransXChangeStream} from "./transxchange/TransXChangeStream";
import {ZipReadStream} from "./input/ZipReadStream";
import {FileReadStream} from "./input/FileReadStream";

/**
 * Dependency container
 */
export class Container {

  public async getConverter(): Promise<Converter> {
    const stopsStream = await this.getStopsStream();
    const used = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(`Memory usage: ${Math.round(used * 100) / 100} MB`);

    return new Converter(
      new ZipReadStream(),
      new FileReadStream(),
      new XMLStream(this.getParseXML()),
      new TransXChangeStream(),
      {
        "stops.txt": stopsStream
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