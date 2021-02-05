import {Transform, TransformCallback} from "stream";

/**
 * Converts an xml string into a JSON object
 */
export class XMLStream extends Transform {

  constructor(private readonly parseXML: ParseXML) {
    super({ objectMode: true });
  }

  /**
   * Transform the XML using the parseXML method
   */
  public async _transform(xml: string, encoding: string, callback: TransformCallback): Promise<void> {
    try {
      const json = await this.parseXML(xml);

      callback(undefined, json);
    } catch (err) {
      callback(err);
    }
  }

}

/**
 * Function that turns an XML string into a JSON object
 */
export type ParseXML = (xml: string) => Promise<any>;
