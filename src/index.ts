
import {Container} from "./cli/Container";

Container
  .getCommand(process.argv[0])
  .run(process.argv)
  .catch(console.error);