import memoize from "memoized-class-decorator";
import {CLICommand} from "./CLICommand";
import {ImportFeedCommand} from "./ImportFeedCommand";
import {DatabaseConnection} from "../database/DatabaseConnection";
import Bluebird = require("bluebird");
import config from "../../config";
import {CleanFaresCommand} from "./CleanFaresCommand";
import {ShowHelpCommand} from "./ShowHelpCommand";
import {OutputGTFSCommand} from "./OutputGTFSCommand";
import {GTFSRepository} from "../gtfs/repository/GTFSRepository";
import {ScheduleOverlayApplication} from "../gtfs/ScheduleOverlayApplication";

export class Container {

  @memoize
  public getCommand(type: string): Promise<CLICommand> {
    switch (type) {
      case "--fares": return this.getFaresImportCommand();
      case "--fares-clean": return this.getCleanFaresCommand();
      case "--routeing": return this.getRouteingImportCommand();
      case "--timetable": return this.getTimetableImportCommand();
      case "--gtfs": return this.getOutputGTFSCommand();
      default: return this.getShowHelpCommand();
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
  public async getShowHelpCommand(): Promise<CLICommand> {
    return new ShowHelpCommand();
  }

  @memoize
  private async getOutputGTFSCommand(): Promise<OutputGTFSCommand> {
    const [promiseDb, streamDb] = await Promise.all([
      this.getDatabaseConnection(),
      this.getDatabaseStream()
    ]);

    return new OutputGTFSCommand(
      new GTFSRepository(promiseDb, streamDb)
    );
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

  @memoize
  public async getDatabaseStream(): Promise<any> {
    if (!process.env.DATABASE_NAME || !process.env.DATABASE_USERNAME) {
      throw new Error("Please set the database environment variables.");
    }

    return await require('mysql2').createPool({
      host: process.env.DATABASE_HOSTNAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      connectionLimit: 3,
      multipleStatements: true,
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });

  }


}
