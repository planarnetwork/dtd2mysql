import {Container} from "./Container";

const input = process.argv.slice(2, process.argv.length - 1).filter(s => s !== "--update-stops");
const output = process.argv[process.argv.length - 1];
const updateStops = process.argv.includes("--update-stops");
const skipStops = process.argv.includes("--skip-stops");
const container = new Container();

container.getConverter(updateStops, skipStops)
  .then(c => c.process(input, output))
  .catch(err => console.error(err));

