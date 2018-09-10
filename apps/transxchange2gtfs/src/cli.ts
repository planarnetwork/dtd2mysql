import * as fs from "fs";
import {WriteStream, ReadStream} from "fs";
import {Container} from "./Container";

const [input, output] = process.argv.slice(2);
const inStream = input ? fs.createReadStream(input, "utf8") : process.stdin;
const outStream = output ? fs.createWriteStream(output) : process.stdout;
const container = new Container();

container.getConverter()
  .then(c => c.process(inStream, outStream))
  .catch(err => console.error(err));

