import {Writable} from "stream";
import autobind from "autobind-decorator";

/**
 * Child process worker
 */
@autobind
export class WorkerStream {

  constructor(private readonly transxchange: Writable) {}

  /**
   * Start listening to messages and tell the master process we're ready
   */
  public start(): void {
    process.on("message", this.messageHandler);

    this.sendToMaster("ready");
  }

  /**
   * Pass on messages to the transxchange stream until we seen an "end" message, then close the stream.
   */
  private messageHandler(data: any) {
    if (data === "end") {
      this.transxchange.end(process.exit);
    }
    else {
      this.transxchange.write(data);
    }
  }

  /**
   * Send a message to the master process.
   */
  private sendToMaster(message: string): void {
    (process as any).send(message);
  }

}
