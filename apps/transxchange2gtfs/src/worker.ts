import {Container} from "./Container";

const container = new Container();

container.getWorker()
  .then(w => w.start())
  .catch(err => console.error(err) || process.exit());