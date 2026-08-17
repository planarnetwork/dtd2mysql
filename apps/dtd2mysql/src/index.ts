import {getCommand} from "./container";

getCommand(process.argv[2])
  .then(c => c.run(process.argv))
  .catch(err => {
    // Without this the process dies on an unhandled rejection, which prints the
    // message under a source excerpt and a stack trace. Matches dtd2gtfs. The
    // errors MySQLStream raises carry their own stack in the message.
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
