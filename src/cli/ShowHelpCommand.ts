
import {CLICommand} from "./CLICommand";

export class ShowHelpCommand implements CLICommand {

  public run(argv: string[]): Promise<void> {
    console.log(`
Usage: dtd2mysql [COMMAND] [FILE]
Import a DTD feed into a MySQL compatible database

  --fares [FILE]             import the fares feed 
  --fares-clean              remove old and irrelevant data
  --timetable [FILE]         import the timetable feed 
  --routeing [FILE]          import the routeing guide data
  --gtfs [DIR]               convert timetable data to GTFS and output txt files in DIR
  --gtfs-zip [FILE]          convert timetable data to GTFS and output zip
  --gtfs-import [DIR]        import the GTFS files in the DIR to a MySQL database
  --download-fares [DIR]     download latest fares refresh from DTD
  --download-timetable [DIR] download latest timetable refresh from DTD
  --download-routeing [DIR]  download latest routeing refresh from DTD
  --get-fares [DIR]          download and process latest fares refresh from DTD
  --get-timetable [DIR]      download and process latest timetable refresh from DTD
  --get-routeing [DIR]       download and process latest routeing refresh from DTD
  
The following environment properties are expected to be set:
  
  DATABASE_USERNAME          mysql username (defaults to root)
  DATABASE_PASSWORD          mysql password (defaults to none)
  DATABASE_NAME              mysql database name
  DATABASE_HOST              mysql database host (defaults to localhost)
  
The --get-* and --download-* commands require SFTP environment properties:

  SFTP_USERNAME              SFTP username
  SFTP_PASSWORD              SFTP password
  SFTP_HOSTNAME              SFTP hostname (defaults to dtd.atocrsp.org)
  
`);

    return Promise.resolve();
  }

}