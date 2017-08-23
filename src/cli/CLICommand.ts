
export interface CLICommand {

  /**
   * Run the command and do *something*
   */
  run(argv: string[]): Promise<any>;

}
