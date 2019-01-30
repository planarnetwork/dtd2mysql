
import {Container} from "./cli/Container";

const container = new Container();

// To allow using as `npm run start command-name` because `npm run start --command-name` doesn't work
let command = process.argv[2];
if (!command.startsWith('--')) {
    command = '--' + command;
}

container
  .getCommand(command)
  .then(c => c.run(process.argv))
  .catch(console.error);