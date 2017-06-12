
export interface CLICommand {

  /**
   * Run the command and *something*
   */
  run(argv: string[]): Promise<void>;

}
