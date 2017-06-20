
import {CLICommand} from "./CLICommand";

export class ShowHelpCommand implements CLICommand {

  public run(argv: string[]): Promise<void> {
    console.log(`
Usage: dtd2mysql [FEED] [FILE]
Import a DTD feed into a MySQL compatible database

  --fares [FILE]             import the fares feed 
  --fares-clean              remove old and irrelevant data
  --timetable [FILE]         import the timetable feed 
  --routeing [FILE]          import the routeing guide data
  
The following environment properties are expected to be set:
  
  DATABASE_USERNAME          mysql username
  DATABASE_PASSWORD          mysql password
  DATABASE_NAME              mysql database name
  DATABASE_HOST              mysql database host (defaults to localhost)`);

    return Promise.resolve();
  }

}