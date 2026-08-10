import {getCommand} from "./container";

getCommand(process.argv[2]).then(c => c.run(process.argv));
