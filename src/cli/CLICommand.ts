import * as child_process from 'node:child_process';

export interface CLICommand {

  /**
   * Run the command and do *something*
   */
  run(argv: string[]): Promise<any>;

}

export function processSpawnResult(result : child_process.SpawnSyncReturns<Buffer>) {
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.signal !== null) {
    throw Error(`Child process has been killed by signal ${result.signal}`);
  }
  if (result.status !== null && result.status !== 0) {
    throw Error(`Child process exited with non-zero status ${result.status}`);
  }
}
