import {ParseXML} from "./xml/ParseXML";
import {promisify} from "util";
import {parseString} from "xml2js";
import {Converter} from "./converter/Converter";
import {StopsFactory} from "./gtfs/StopsFactory";
import parse = require("csv-parse");
import {NaPTANFactory} from "./reference/NaPTAN";
import AdmZip = require("adm-zip");
import {TransXChangeFactory} from "./transxchange/TransXChangeFactory";

/**
 * Dependency container
 */
export class Container {

  public async getConverter(): Promise<Converter> {
    const stopsFactory = await this.getStopsFactory();
    const used = process.memoryUsage().heapUsed / 1024 / 1024;

    console.log(`Memory usage: ${Math.round(used * 100) / 100} MB`);

    return new Converter(
      this.getParseXML(),
      new AdmZip(),
      this.getTransXChangeFactory().getTransXChange,
      stopsFactory.getStops
    );
  }

  public async getStopsFactory(): Promise<StopsFactory> {
    const naptanFactory = new NaPTANFactory(
      new AdmZip(__dirname + "/../resource/Stops.zip"),
      parse()
    );

    const naptanIndex = await naptanFactory.getIndex();

    return new StopsFactory(naptanIndex);
  }

  public getParseXML(): ParseXML {
    return promisify(parseString as any);
  }

  public getTransXChangeFactory(): TransXChangeFactory {
    return new TransXChangeFactory();
  }
}