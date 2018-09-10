import {TransXChangeStream} from "./transxchange/TransXChangeStream";
import {XML2JSON} from "./xml/XML2JSON";
import {promisify} from "util";
import {parseString} from "xml2js";
import {Converter} from "./converter/Converter";

/**
 * Dependency container
 */
export class Container {

  public async getConverter(): Promise<Converter> {
    return new Converter(this.getXML2JSON(), this.getTransXChangeStream());
  }

  public getTransXChangeStream(): TransXChangeStream {
    return new TransXChangeStream();
  }

  public getXML2JSON(): XML2JSON {
    return new XML2JSON(promisify(parseString as any));
  }

}