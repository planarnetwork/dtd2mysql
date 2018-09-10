import {Transform, TransformCallback} from "stream";
import {OptionsV2} from "xml2js";

export class XML2JSON extends Transform {

  constructor(private readonly parse: Parse) {
    super({ objectMode: true });
  }

  public async _transform(chunk: string, encoding: string, callback: TransformCallback): Promise<void> {
    try {
      const json = await this.parse(chunk);

      callback(undefined, json);
    }
    catch (err) {
      callback(err);
    }
  }

}

export type Parse = (xml: string) => Promise<Object>;