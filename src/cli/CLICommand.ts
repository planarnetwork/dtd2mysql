
export interface CLICommand {

  /**
   * Run the command and *something*
   */
  run(argv: string[]): Promise<Result>;

}

/**
 * Parent class for Success and Failure results.
 */
export interface Result {

  readonly isSuccess: boolean;

}

export class Success<T> implements Result {
  public readonly isSuccess = true;

  constructor(
    public readonly value?: T
  ) {}

}

export class Failure implements Result {
  public readonly isSuccess = false;

  constructor(
    public readonly reason: string
  ) {}


}