import {Transform, Readable, Writable} from "stream";
import {XML2JSON} from "../xml/XML2JSON";
import {TransXChangeStream} from "../transxchange/TransXChangeStream";

export class Converter {

  constructor(
    private readonly xml2json: XML2JSON,
    private readonly transxchange: TransXChangeStream
  ) {}

  public async process(input: Readable, output: Writable): Promise<void> {
    this.xml2json.pipe(this.transxchange).pipe(output);

    const xml = await streamToString(input);
    this.xml2json.write(xml);
  }
}

function streamToString(stream: Readable): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let result = "";

    stream.on("data", data => result += data);
    stream.on("end", () => resolve(result));
    stream.on("error", reject);
  });
}