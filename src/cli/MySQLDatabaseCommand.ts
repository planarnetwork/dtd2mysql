import { CLICommand } from "./CLICommand";

export class MySQLDatabaseCommand implements CLICommand {
  async run(argv: string[]): Promise<any> {
    console.log("Using MySQL database.");
    // Add any MySQL-specific logic here
  }
} 