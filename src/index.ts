
import {Container} from "./cli/Container";

const container = new Container();

container
  .getCommand(process.argv[2])
  .then(c => c.run(process.argv));