
import {CLICommand} from "./CLICommand";
import {execSync} from "child_process";
import {DatabaseConfiguration} from "../database/DatabaseConnection";
import {readFileSync} from "fs";


export class GTFSImportCommand implements CLICommand {

  constructor(
    private readonly db: DatabaseConfiguration
  ) { }

  /**
   * Create the text files and then zip them up using a CLI command that hopefully exists.
   */
  public async run(argv: string[]): Promise<void> {
    const path = argv[3] || "./";
    const schemaPath = require.resolve("../../config/gtfs/schema.sql");
    const importPath = require.resolve("../../config/gtfs/import.sql");
    const schema = readFileSync(schemaPath, "utf8").replace(/`/g, "\\`");
    const importSQL = readFileSync(importPath, "utf8").replace(/`/g, "\\`");
    const mysqlExec = `mysql -h${this.db.host} -u${this.db.user} ${this.db.password ? "-p" + this.db.password : ""} ${this.db.database} -e`;

    execSync(`${mysqlExec} "${schema}"`, { cwd: path });
    execSync(`${mysqlExec} "${importSQL}"`, { cwd: path });
  }

}