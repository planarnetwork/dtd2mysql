import {Transform, TransformCallback} from "stream";

export class TransXChangeStream extends Transform {

  constructor() {
    super({ objectMode: true });
  }

  public _transform(chunk: Object, encoding: string, callback: TransformCallback): void {
    console.log(chunk);
    callback();
  }

}