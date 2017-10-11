
import {CLICommand} from "./CLICommand";
import {execSync} from "child_process";
import {DatabaseConfiguration} from "../database/DatabaseConnection";
import {schema} from "../../config/gtfs/schema";
import {importSQL} from "../../config/gtfs/import";


export class GTFSImportCommand implements CLICommand {

  constructor(
    private readonly db: DatabaseConfiguration
  ) { }

  /**
   * Create the text files and then zip them up using a CLI command that hopefully exists.
   */
  public async run(argv: string[]): Promise<void> {
    const path = argv[3] || "./";
    const schemaEsc = schema.replace(/`/g, "\\`");
    const importSQLEsc = importSQL.replace(/`/g, "\\`");
    const mysqlExec = `mysql -h${this.db.host} -u${this.db.user} ${this.db.password ? "-p" + this.db.password : ""} ${this.db.database} -e`;

    execSync(`${mysqlExec} "${schemaEsc}"`, { cwd: path });
    execSync(`${mysqlExec} "${importSQLEsc}"`, { cwd: path });
  }

}