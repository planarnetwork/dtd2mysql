
import {CLICommand} from "./CLICommand";

export class ShowHelpCommand implements CLICommand {

  public run(argv: string[]): Promise<void> {
    console.log(`
Usage: dtd2mysql [COMMAND] [FILE]
Import a DTD feed into a MySQL compatible database

  --gtfs [DIR]                       convert timetable data to GTFS and output txt files in DIR
  --gtfs-zip [FILE]                  convert timetable data to GTFS and output zip
  --gtfs-import [DIR]                import the GTFS files in the DIR to a MySQL database

  --fares [FILE]                     import the fares feed 
  --fares-clean                      remove old and irrelevant data
  --timetable [FILE]                 import the timetable feed 
  --routeing [FILE]                  import the routeing guide data
  --nfm64 [FILE]                     import the nfm64 data
  --idms-fixed-links [FILE]          import the IMDS fixed links data
  
  --download-fares [DIR]             download latest fares refresh from DTD
  --download-timetable [DIR]         download latest timetable refresh from DTD
  --download-routeing [DIR]          download latest routeing refresh from DTD
  --download-idms-fixed-links [DIR]  download latest IDMS fixed links data from their S3 bucket
  --download-nfm64 [DIR]             download nfm64 data
  
  --get-fares [DIR]                  download and process latest fares refresh from DTD
  --get-timetable [DIR]              download and process latest timetable refresh from DTD
  --get-routeing [DIR]               download and process latest routeing refresh from DTD
  --get-nfm64 [DIR]                  download and process latest nfm64 file
  --get-idms-fixed-links [DIR]       download and process latest IDMS fixed links file

The following environment properties are expected to be set:
  
  DATABASE_USERNAME                  mysql username (defaults to root)
  DATABASE_PASSWORD                  mysql password (defaults to none)
  DATABASE_NAME                      mysql database name
  DATABASE_HOSTNAME                  mysql database host (defaults to localhost)
  
The --get-* and --download-* commands require SFTP environment properties:

  SFTP_USERNAME                      SFTP username
  SFTP_PASSWORD                      SFTP password
  SFTP_HOSTNAME                      SFTP hostname (defaults to dtd.atocrsp.org)

Downloading IDMS files from a non-allowed host (like a dev box) requires:

  S3_KEY                             your S3 key
  S3_SECRET                          your S3 secret
  S3_PROXY                           your proxy address
  
See README.md for details.
  
`);

    return Promise.resolve();
  }

}
