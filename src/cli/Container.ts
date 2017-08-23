import memoize from "memoized-class-decorator";
import SFTP = require("ssh2-sftp-client");
import {CLICommand} from "./CLICommand";
import {ImportFeedCommand} from "./ImportFeedCommand";
import {DatabaseConnection} from "../database/DatabaseConnection";
import Bluebird = require("bluebird");
import config from "../../config";
import {CleanFaresCommand} from "./CleanFaresCommand";
import {ShowHelpCommand} from "./ShowHelpCommand";
import {OutputGTFSCommand} from "./OutputGTFSCommand";
import {CIFRepository} from "../gtfs/repository/CIFRepository";
import {stationCoordinates} from "../../config/gtfs/station-coordinates";
import {FileOutput} from "../gtfs/output/FileOutput";
import {GTFSOutput} from "../gtfs/output/GTFSOutput";
import {OutputGTFSZipCommand} from "./OutputGTFSZipCommand";
import {DownloadCommand} from "./DownloadCommand";
import {DownloadAndProcessCommand} from "./DownloadAndProcessCommand";

export class Container {

  @memoize
  public getCommand(type: string): Promise<CLICommand> {
    switch (type) {
      case "--fares": return this.getFaresImportCommand();
      case "--fares-clean": return this.getCleanFaresCommand();
      case "--routeing": return this.getRouteingImportCommand();
      case "--timetable": return this.getTimetableImportCommand();
      case "--gtfs": return this.getOutputGTFSCommand();
      case "--gtfs-zip": return this.getOutputGTFSZipCommand();
      case "--download-fares": return this.getDownloadCommand("/fares/");
      case "--download-timetable": return this.getDownloadCommand("/timetable/");
      case "--download-routeing": return this.getDownloadCommand("/routeing_guide/");
      case "--get-fares": return this.getDownloadAndProcessCommand("/fares/", this.getFaresImportCommand());
      case "--get-timetable": return this.getDownloadAndProcessCommand("/timetable/", this.getTimetableImportCommand());
      case "--get-routeing": return this.getDownloadAndProcessCommand("/routeing_guide/", this.getRouteingImportCommand());
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
  private async getOutputGTFSCommandWithOutput(output: GTFSOutput): Promise<OutputGTFSCommand> {
    const [promiseDb, streamDb] = await Promise.all([
      this.getDatabaseConnection(),
      this.getDatabaseStream()
    ]);

    return new OutputGTFSCommand(
      new CIFRepository(promiseDb, streamDb, stationCoordinates),
      output
    );
  }

  @memoize
  private async getOutputGTFSCommand(): Promise<OutputGTFSCommand> {
    return this.getOutputGTFSCommandWithOutput(new FileOutput());
  }

  @memoize
  private async getOutputGTFSZipCommand(): Promise<OutputGTFSZipCommand> {
    return new OutputGTFSZipCommand(await this.getOutputGTFSCommand());
  }

  @memoize
  private async getDownloadCommand(path: string): Promise<DownloadCommand> {
    return new DownloadCommand(await this.getSFTP(), path);
  }

  @memoize
  private async getDownloadAndProcessCommand(path: string, process: Promise<ImportFeedCommand>): Promise<DownloadAndProcessCommand> {
    return new DownloadAndProcessCommand(await this.getDownloadCommand(path), await process);
  }

  @memoize
  private async getSFTP(): Promise<SFTP> {
    const sftp = new SFTP();

    await sftp.connect({
      host: process.env.SFTP_HOSTNAME || "dtd.atocrsp.org",
      username: process.env.SFTP_USERNAME,
      password: process.env.SFTP_PASSWORD,
    });

    return sftp;
  }

  @memoize
  public async getDatabaseConnection(): Promise<DatabaseConnection> {
    if (!process.env.DATABASE_NAME) {
      throw new Error("Please set the database environment variables.");
    }

    return await require('mysql2/promise').createPool({
      host: process.env.DATABASE_HOSTNAME || "localhost",
      user: process.env.DATABASE_USERNAME || "root",
      password: process.env.DATABASE_PASSWORD || null,
      database: process.env.DATABASE_NAME,
      connectionLimit: 3,
      multipleStatements: true,
      promise: Bluebird,
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });
  }

  @memoize
  public async getDatabaseStream(): Promise<any> {
    if (!process.env.DATABASE_NAME) {
      throw new Error("Please set the database environment variables.");
    }

    return await require('mysql2').createPool({
      host: process.env.DATABASE_HOSTNAME || "localhost",
      user: process.env.DATABASE_USERNAME || "root",
      password: process.env.DATABASE_PASSWORD || null,
      database: process.env.DATABASE_NAME,
      connectionLimit: 3,
      multipleStatements: true,
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });

  }


}
