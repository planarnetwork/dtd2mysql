import * as memoize from "memoized-class-decorator";
import * as SFTP from "ssh2-sftp-client";
import {CLICommand} from "./CLICommand";
import {ImportFeedCommand} from "./ImportFeedCommand";
import {DatabaseConfiguration, DatabaseConnection} from "../database/DatabaseConnection";
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
import {acceptedRailcards, restrictionTables, ticketCodeWhitelist} from "../../config/fares/clean";
import {GTFSImportCommand} from "./GTFSImportCommand";
import {downloadUrl} from "../../config/nfm64";
import {DownloadFileCommand} from "./DownloadFileCommand";

export class Container {

  @memoize
  public getCommand(type: string): Promise<CLICommand> {
    switch (type) {
      case "--fares": return this.getFaresImportCommand();
      case "--fares-clean": return this.getCleanFaresCommand();
      case "--routeing": return this.getRouteingImportCommand();
      case "--timetable": return this.getTimetableImportCommand();
      case "--nfm64": return this.getNFM64ImportCommand();
      case "--gtfs": return this.getOutputGTFSCommand();
      case "--gtfs-import": return this.getImportGTFSCommand();
      case "--gtfs-zip": return this.getOutputGTFSZipCommand();
      case "--download-fares": return this.getDownloadCommand("/fares/");
      case "--download-timetable": return this.getDownloadCommand("/timetable/");
      case "--download-routeing": return this.getDownloadCommand("/routing_guide/");
      case "--download-nfm64": return this.getDownloadNFM64Command();
      case "--get-fares": return this.getDownloadAndProcessCommand("/fares/", this.getFaresImportCommand());
      case "--get-timetable": return this.getDownloadAndProcessCommand("/timetable/", this.getTimetableImportCommand());
      case "--get-routeing": return this.getDownloadAndProcessCommand("/routing_guide/", this.getRouteingImportCommand());
      case "--get-nfm64": return this.getDownloadAndProcessNFM64Command();
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
  public async getNFM64ImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.nfm64, "/tmp/dtd/nfm64/");
  }


  @memoize
  public async getCleanFaresCommand(): Promise<CLICommand> {
    return new CleanFaresCommand(await this.getDatabaseConnection(), ticketCodeWhitelist, acceptedRailcards, restrictionTables);
  }

  @memoize
  public async getShowHelpCommand(): Promise<CLICommand> {
    return new ShowHelpCommand();
  }

  @memoize
  public getImportGTFSCommand(): Promise<GTFSImportCommand> {
    return Promise.resolve(new GTFSImportCommand(this.databaseConfiguration));
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
  private async getDownloadNFM64Command(): Promise<DownloadFileCommand> {
    return Promise.resolve(new DownloadFileCommand(downloadUrl));
  }

  @memoize
  private async getDownloadAndProcessCommand(path: string, process: Promise<ImportFeedCommand>): Promise<DownloadAndProcessCommand> {
    return new DownloadAndProcessCommand(await this.getDownloadCommand(path), await process);
  }

  @memoize
  private async getDownloadAndProcessNFM64Command(): Promise<DownloadAndProcessCommand> {
    return new DownloadAndProcessCommand(
      await this.getDownloadNFM64Command(),
      await this.getNFM64ImportCommand()
    );
  }

  @memoize
  private async getSFTP(): Promise<SFTP> {
    const sftp = new SFTP();

    await sftp.connect({
      host: process.env.SFTP_HOSTNAME || "dtd.atocrsp.org",
      username: process.env.SFTP_USERNAME,
      password: process.env.SFTP_PASSWORD,
      algorithms: {
        serverHostKey: ['ssh-dss']
      }
    });

    return sftp;
  }

  @memoize
  public async getDatabaseConnection(): Promise<DatabaseConnection> {
    return await require('mysql2/promise').createPool({
      ...this.databaseConfiguration,
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });
  }

  @memoize
  public async getDatabaseStream(): Promise<any> {
    return await require('mysql2').createPool(this.databaseConfiguration);

  }

  public get databaseConfiguration(): DatabaseConfiguration {
    if (!process.env.DATABASE_NAME) {
      throw new Error("Please set the DATABASE_NAME environment variable.");
    }

    return {
      host: process.env.DATABASE_HOSTNAME || "localhost",
      user: process.env.DATABASE_USERNAME || "root",
      password: process.env.DATABASE_PASSWORD || null,
      database: <string>process.env.DATABASE_NAME,
      connectionLimit: 3,
      multipleStatements: true
    };
  }

}
