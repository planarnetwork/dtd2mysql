
import {Container} from "./cli/Container";

const container = new Container();

let command = process.argv[2];
if (!command.startsWith('--')) {
    command = '--' + command;
}

container
  .getCommand(command)
  .then(c => c.run(process.argv))
  .catch(console.error);