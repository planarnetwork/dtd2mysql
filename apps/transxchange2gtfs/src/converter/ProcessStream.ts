import {ChildProcess, fork} from "child_process";
import {Writable} from "stream";
import {TransXChange} from "../transxchange/TransXChange";
import autobind from "autobind-decorator";

/**
 * Stream that sends data to a child process
 */
@autobind
export class ProcessStream extends Writable {
  private child: ChildProcess | undefined;

  constructor(private readonly childFile: string) {
    super({ objectMode: true });

  }

  /**
   * Fork the child process, resolve the promise when the child reports it's ready
   */
  public fork(): Promise<void> {
    this.child = fork(this.childFile);

    return new Promise(resolve => this.child!.once("message", resolve));
  }

  /**
   * Send the data to the child, assume more data can be sent (no back-pressure).
   */
  public _write(chunk: TransXChange, encoding: string, callback: (err?: Error) => any): void {
    this.child!.send(chunk);

    callback();
  }

  /**
   * Intercept the end message and send it to the child, complete the end process once the child has quit.
   */
  public end(): void {
    this.child!.on("exit", () => {
      super.end(...arguments);
    });

    this.child!.send("end");
  }

}