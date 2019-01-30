import * as memoize from "memoized-class-decorator";
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
import {GTFSImportCommand} from "./GTFSImportCommand";
import {nmf64DownloadUrl} from "../../config/nfm64";
import {DownloadFileCommand} from "./DownloadFileCommand";
import {PromiseSFTP} from "../sftp/PromiseSFTP";
import {ImportIdmsFixedLinksCommand} from "./ImportIdmsFixedLinksCommand";
import * as AWS from 'aws-sdk';
import * as proxy from "proxy-agent";
import {DownloadFileFromS3Command} from "./DownloadFileFromS3Command";
import {idmsFixedLinksDownloadUrl} from "../../config/idms";

export class Container {

  @memoize
  public getCommand(type: string): Promise<CLICommand> {
    switch (type) {
      case "--fares": return this.getFaresImportCommand();
      case "--fares-clean": return this.getCleanFaresCommand();
      case "--routeing": return this.getRouteingImportCommand();
      case "--timetable": return this.getTimetableImportCommand();
      case "--nfm64": return this.getNFM64ImportCommand();
      case "--idms-fixed-links": return this.getIdmsFixedLinksImportCommand();
      case "--gtfs": return this.getOutputGTFSCommand();
      case "--gtfs-import": return this.getImportGTFSCommand();
      case "--gtfs-zip": return this.getOutputGTFSZipCommand();
      case "--download-fares": return this.getDownloadCommand("/fares/");
      case "--download-timetable": return this.getDownloadCommand("/timetable/");
      case "--download-routeing": return this.getDownloadCommand("/routing_guide/");
      case "--download-nfm64": return this.getDownloadNFM64Command();
      case "--download-idms-fixed-links": return this.getDownloadIdmsFixedLinksCommand();
      case "--get-fares": return this.getDownloadAndProcessCommand("/fares/", this.getFaresImportCommand());
      case "--get-timetable": return this.getDownloadAndProcessCommand("/timetable/", this.getTimetableImportCommand());
      case "--get-routeing": return this.getDownloadAndProcessCommand("/routing_guide/", this.getRouteingImportCommand());
      case "--get-nfm64": return this.getDownloadAndProcessNFM64Command();
      case "--get-idms-fixed-links": return this.getDownloadAndProcessIdmsFixedLinksCommand();
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
  public async getIdmsFixedLinksImportCommand(): Promise<ImportIdmsFixedLinksCommand> {
    return new ImportIdmsFixedLinksCommand(await this.getDatabaseConnection(), config.idms, "/tmp/idms/fixed-links/");
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
  public getImportGTFSCommand(): Promise<GTFSImportCommand> {
    return Promise.resolve(new GTFSImportCommand(this.databaseConfiguration));
  }

  @memoize
  private getOutputGTFSCommandWithOutput(output: GTFSOutput): OutputGTFSCommand {
    return new OutputGTFSCommand(
      new CIFRepository(
        this.getDatabaseConnection(),
        this.getDatabaseStream(),
        stationCoordinates
      ),
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
    return new DownloadCommand(await this.getDatabaseConnection(), await this.getSFTP(), path);
  }

  @memoize
  private async getDownloadNFM64Command(): Promise<DownloadFileCommand> {
    return Promise.resolve(new DownloadFileCommand(nmf64DownloadUrl, 'nfm64.zip'));
  }

  @memoize
  private async getDownloadIdmsFixedLinksCommand(): Promise<DownloadFileFromS3Command | DownloadFileCommand> {
    const command = process.env.S3_KEY
        // Download via S3 API
        ? new DownloadFileFromS3Command(await this.getS3(), 'idms', 'FixedLinks_v1.0.xml')
        // Download via HTTPS
        : new DownloadFileCommand(idmsFixedLinksDownloadUrl, 'FixedLinks_v1.0.xml');

    return Promise.resolve(command);
  }
  
  private async getS3(): Promise<AWS.S3> {
    const key = process.env.S3_KEY;
    const secret = process.env.S3_SECRET;
    const region = process.env.S3_REGION || 'eu-west-1';
    const proxyUrl = process.env.S3_PROXY;
    const debug = process.env.DEBUG;
    
    if (!key || !secret) {
      throw new Error('S3_KEY and S3_SECRET environment variables need to be set in order to download IDMS data');
    }
    
    const config: AWS.S3.Types.ClientConfiguration = {
      region: region,
      credentials: new AWS.Credentials(key, secret),
    };
    
    if (debug) {
      config.logger = console;
    }
    
    if (proxyUrl) {
      config.httpOptions = { agent: proxy(proxyUrl)};
    }

    return new AWS.S3(config);
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
  private async getDownloadAndProcessIdmsFixedLinksCommand(): Promise<DownloadAndProcessCommand> {
    return new DownloadAndProcessCommand(
      await this.getDownloadIdmsFixedLinksCommand(),
      await this.getIdmsFixedLinksImportCommand()
    );
  }

  @memoize
  private getSFTP(): Promise<PromiseSFTP> {
    return PromiseSFTP.connect({
      host: process.env.SFTP_HOSTNAME || "dtd.atocrsp.org",
      username: process.env.SFTP_USERNAME,
      password: process.env.SFTP_PASSWORD,
      algorithms: {
        serverHostKey: ['ssh-dss']
      }
    });
  }

  @memoize
  public getDatabaseConnection(): DatabaseConnection {
    return require('mysql2/promise').createPool({
      ...this.databaseConfiguration,
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });
  }

  @memoize
  public getDatabaseStream() {
    return require('mysql2').createPool(this.databaseConfiguration);

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
      connectionLimit: 200,
      multipleStatements: true
    };
  }

}
