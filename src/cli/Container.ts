import * as memoize from "memoized-class-decorator";
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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
import {downloadUrl} from "../../config/nfm64";
import {DownloadFileCommand} from "./DownloadFileCommand";
import {PromiseSFTP} from "../sftp/PromiseSFTP";
import {SnowflakeDatabaseCommand} from "./SnowflakeDatabaseCommand";
import {MySQLDatabaseCommand} from "./MySQLDatabaseCommand";

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
      case "--database-type": return this.getDatabaseTypeCommand();
      default: return this.getShowHelpCommand();
    }
  }

  @memoize
  public async getFaresImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.fares, fs.mkdtempSync(path.join(os.tmpdir(), "dtd")));
  }

  @memoize
  public async getRouteingImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.routeing, fs.mkdtempSync(path.join(os.tmpdir(), "dtd")));
  }

  @memoize
  public async getTimetableImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.timetable, fs.mkdtempSync(path.join(os.tmpdir(), "dtd")));
  }

  @memoize
  public async getNFM64ImportCommand(): Promise<ImportFeedCommand> {
    return new ImportFeedCommand(await this.getDatabaseConnection(), config.nfm64, fs.mkdtempSync(path.join(os.tmpdir(), "dtd")));
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
  private getSFTP(): Promise<PromiseSFTP> {
    return PromiseSFTP.connect({
      host: process.env.SFTP_HOSTNAME || "dtd.atocrsp.org",
      username: process.env.SFTP_USERNAME,
      password: process.env.SFTP_PASSWORD,
      algorithms: {
        kex: [
          "diffie-hellman-group1-sha1",
          "ecdh-sha2-nistp256",
          "ecdh-sha2-nistp384",
          "ecdh-sha2-nistp521",
          "diffie-hellman-group-exchange-sha256",
          "diffie-hellman-group14-sha1"
        ],
        cipher: [
          "3des-cbc",
          "aes128-ctr",
          "aes192-ctr",
          "aes256-ctr",
          "aes128-gcm",
          "aes128-gcm@openssh.com",
          "aes256-gcm",
          "aes256-gcm@openssh.com"
        ],
        serverHostKey: [
          "ssh-dss",
          "ssh-rsa",
          "ecdsa-sha2-nistp256",
          "ecdsa-sha2-nistp384",
          "ecdsa-sha2-nistp521"
        ],
        hmac: [
          "hmac-sha2-256",
          "hmac-sha2-512",
          "hmac-sha1"
        ]
      }
    });
  }

  @memoize
  public getDatabaseConnection(): DatabaseConnection {
    const dbType = process.env.DATABASE_TYPE || "mysql";
    if (dbType === "snowflake") {
      return require('snowflake-sdk').createPool({
        ...this.databaseConfiguration,
        account: this.databaseConfiguration.host,
        username: this.databaseConfiguration.user,
        password: this.databaseConfiguration.password,
        database: this.databaseConfiguration.database,
        schema: this.databaseConfiguration.schema,
        warehouse: this.databaseConfiguration.warehouse,
        role: this.databaseConfiguration.role
      });
    } else {
      return require('mysql2/promise').createPool({
        ...this.databaseConfiguration,
        //debug: ['ComQueryPacket', 'RowDataPacket']
      });
    }
  }

  @memoize
  public getDatabaseStream() {
    return require('mysql2').createPool(this.databaseConfiguration);
  }

  public get databaseConfiguration(): DatabaseConfiguration {
    if (!process.env.DATABASE_NAME) {
      throw new Error("Please set the DATABASE_NAME environment variable.");
    }

    const config = {
      host: process.env.DATABASE_HOSTNAME || "localhost",
      user: process.env.DATABASE_USERNAME || "root",
      password: process.env.DATABASE_PASSWORD || null,
      database: <string>process.env.DATABASE_NAME,
      port: +(process.env.DATABASE_PORT || 3306),
      connectionLimit: 20,
      multipleStatements: true
    };

    if (process.env.DATABASE_TYPE === "snowflake") {
      if (!process.env.SNOWFLAKE_SCHEMA) {
        throw new Error("Please set the SNOWFLAKE_SCHEMA environment variable.");
      }
      if (!process.env.SNOWFLAKE_WAREHOUSE) {
        throw new Error("Please set the SNOWFLAKE_WAREHOUSE environment variable.");
      }
      if (!process.env.SNOWFLAKE_ROLE) {
        throw new Error("Please set the SNOWFLAKE_ROLE environment variable.");
      }
      return {
        ...config,
        schema: process.env.SNOWFLAKE_SCHEMA,
        warehouse: process.env.SNOWFLAKE_WAREHOUSE,
        role: process.env.SNOWFLAKE_ROLE
      };
    }

    return config;
  }

  @memoize
  public async getDatabaseTypeCommand(): Promise<CLICommand> {
    const dbType = process.env.DATABASE_TYPE || "mysql";
    if (dbType === "snowflake") {
      return new SnowflakeDatabaseCommand();
    } else {
      return new MySQLDatabaseCommand();
    }
  }

}
