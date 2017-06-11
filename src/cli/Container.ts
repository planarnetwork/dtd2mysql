
import {CLICommand} from "./CLICommand";
import {ImportFeedCommand} from "./ImportFeedCommand";
import {DatabaseConnection} from "../database/DatabaseConnection";
import {CreateSchemaCommand} from "../database/command/CreateSchemaCommand";
import Bluebird = require("bluebird");

export class Container {

  public static getCommand(type: string): CLICommand {
    switch (type) {
      case "--fares": return Container.getFaresImportCommand();
      case "--routeing": return this.getFaresImportCommand();
      default: return this.getShowHelpCommand();
    }
  }

  public static getFaresImportCommand(): ImportFeedCommand {
    return new ImportFeedCommand(faresFeed, Container.getCreateSchemaCommand(), Container.getImportRecordCommand())
  }

  public static getCreateSchemaCommand(): CreateSchemaCommand {
    return new CreateSchemaCommand(Container.getDatabaseConnection());
  }

  public static async getDatabaseConnection(): DatabaseConnection {
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
      promise: Bluebird
      //debug: ['ComQueryPacket', 'RowDataPacket']
    });

  }

}
