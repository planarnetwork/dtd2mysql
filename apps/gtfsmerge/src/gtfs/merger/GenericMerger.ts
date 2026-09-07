
import { Writable } from "stream";

/**
 * Pass the data through to the output stream
 */
export class GenericMerger {

  constructor(
    private readonly stream: Writable
  ) {}

  /**
   * Write all the given entries to the output stream
   */
  public async write(items: any[]): Promise<void> {
    for (const item of items) {
      await this.push(item);
    }
  }

  private push(data: any): Promise<void> | void {
    const writable = this.stream.write(data);

    if (!writable) {
      return new Promise(resolve => this.stream.once("drain", () => resolve()));
    }
  }

  /**
   * Flush all the data to the output stream
   */
  public end(): Promise<void> {
    return new Promise(resolve => this.stream.end(resolve));
  }

}
