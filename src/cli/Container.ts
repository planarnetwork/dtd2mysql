import memoize from "memoized-class-decorator";
import {CLICommand} from "./CLICommand";
import {ImportFeedCommand} from "./ImportFeedCommand";
import {DatabaseConnection} from "../database/DatabaseConnection";
import Bluebird = require("bluebird");
import config from "../../config";
import {CleanFaresCommand} from "./CleanFaresCommand";

export class Container {

  @memoize
  public getCommand(type: string): Promise<CLICommand> {
    switch (type) {
      case "--fares": return this.getFaresImportCommand();
      case "--fares-clean": return this.getCleanFaresCommand();
      case "--routeing": return this.getRouteingImportCommand();
      case "--timetable": return this.getTimetableImportCommand();
      default: throw new Error(`Unknown command: ${type}`) //return this.getShowHelpCommand();
    }
  }

  @memoize
  public async getFaresImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.fares, "/tmp/dtd/fares/");
  }

  @memoize
  public async getRouteingImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.routeing, "/tmp/dtd/routeing/");
  }

  @memoize
  public async getTimetableImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.timetable, "/tmp/dtd/timetable/");
  }

  @memoize
  public async getCleanFaresCommand(): Promise<CLICommand> {
    return new CleanFaresCommand(await this.getDatabaseConnection());
  }

  @memoize
  public async getDatabaseConnection(): Promise<DatabaseConnection> {
    if (!process.env.DATABASE_NAME || !process.env.DATABASE_USERNAME) {
      throw new Error("Please set the database environment variables.");
    }

    return await require('mysql2/promise').createPool({
      host: process.env.DATABASE_HOSTNAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 3,
      multipleStatements: true,
      promise: Bluebird,
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });

  }

}
