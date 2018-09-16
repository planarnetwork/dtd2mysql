import {Container} from "./Container";

const input = process.argv.slice(2, process.argv.length - 2);
const output = process.argv[process.argv.length - 1];

const container = new Container();

container.getConverter()
  .then(c => c.process(input, output))
  .catch(err => console.error(err));

