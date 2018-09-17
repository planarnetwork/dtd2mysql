import {Transform, TransformCallback} from "stream";

/**
 * Converts an xml string into a JSON object
 */
export class XMLStream extends Transform {

  constructor(private readonly parseXML: ParseXML) {
    super({ objectMode: true });
  }

  /**
   * Transform the XML usign the parseXML method
   */
  public async _transform(chunk: string, encoding: string, callback: TransformCallback): Promise<void> {
    const xml = await this.parseXML(chunk);

    callback(undefined, xml);
  }

}

/**
 * Function that turns an XML string into a JSON object
 */
export type ParseXML = (xml: string) => Promise<any>;
