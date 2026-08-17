import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import mysql from "mysql2";
import mysqlPromise from "mysql2/promise";
import config, {downloadUrl} from "@gb-transit/dtd-schema";
import {BuildFeed, GTFSOutput, stationCoordinates} from "@gb-transit/gtfs";
import {FileOutput, OutputGTFSZipCommand} from "@gb-transit/gtfs-output";
import {
  DownloadAndProcessCommand,
  DownloadCommand,
  DownloadFileCommand,
  PromiseSFTP
} from "@gb-transit/dtd-source";
import {CLICommand} from "./cli/CLICommand";
import {CleanFaresCommand} from "./cli/CleanFaresCommand";
import {GTFSImportCommand} from "./cli/GTFSImportCommand";
import {ImportFeedCommand} from "./cli/ImportFeedCommand";
import {ShowHelpCommand} from "./cli/ShowHelpCommand";
import {DatabaseConfiguration, DatabaseConnection} from "./database/DatabaseConnection";
import {LogTableFeedCursor} from "./source/LogTableFeedCursor";
import {MySqlTimetableSource} from "./source/MySqlTimetableSource";

/**
 * Composition root for the dtd2mysql CLI: it resolves a flag to the command that
 * implements it, and owns the two connection pools everything else shares.
 *
 * The pools are created on first use rather than at module load, because
 * `dtd2mysql --help` has to work without DATABASE_NAME set.
 */

/**
 * Remember the first result for a given argument, so asking for the same command
 * twice - which `--get-fares` does - gets the same instance.
 */
function once<A, R>(fn: (arg: A) => R): (arg: A) => R {
  const results = new Map<A, R>();

  return arg => {
    if (!results.has(arg)) {
      results.set(arg, fn(arg));
    }

    return results.get(arg)!;
  };
}

export function databaseConfiguration(): DatabaseConfiguration {
  if (!process.env.DATABASE_NAME) {
    throw new Error("Please set the DATABASE_NAME environment variable.");
  }

  return {
    host: process.env.DATABASE_HOSTNAME || "localhost",
    user: process.env.DATABASE_USERNAME || "root",
    password: process.env.DATABASE_PASSWORD || null,
    database: <string>process.env.DATABASE_NAME,
    port: +(process.env.DATABASE_PORT || 3306),
    connectionLimit: 20,
    multipleStatements: true,
    // return DATE columns as YYYY-MM-DD rather than a Date at local midnight, so that reading a
    // date out of the database does not depend on the timezone of the machine doing the reading
    dateStrings: true
  };
}

/**
 * DatabaseConfiguration types `password` as `string | null` while mysql2 types it
 * as `string | undefined`. The driver accepts null, and null is what an unset
 * DATABASE_PASSWORD resolves to.
 */
function poolOptions(): mysql.PoolOptions {
  return databaseConfiguration() as unknown as mysql.PoolOptions;
}

/**
 * DatabaseConnection models a pool and a connection with one type, so it declares
 * release(), which a pool does not have. Nothing calls release() on the pool.
 */
const getDatabaseConnection = once((_: null): DatabaseConnection =>
  mysqlPromise.createPool(poolOptions()) as unknown as DatabaseConnection
);

const getDatabaseStream = once((_: null): mysql.Pool =>
  mysql.createPool(poolOptions())
);

const databaseConnection = () => getDatabaseConnection(null);
const databaseStream = () => getDatabaseStream(null);

const getImportFeedCommand = once((feed: "fares" | "routeing" | "timetable" | "nfm64") =>
  new ImportFeedCommand(
    databaseConnection(),
    config[feed],
    fs.mkdtempSync(path.join(os.tmpdir(), "dtd"))
  )
);

const getSFTP = once((_: null): Promise<PromiseSFTP> =>
  PromiseSFTP.connect({
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
  })
);

const getDownloadCommand = once(async (directory: string) =>
  new DownloadCommand(
    new LogTableFeedCursor(databaseConnection()),
    await getSFTP(null),
    directory
  )
);

function buildFeed(output: GTFSOutput): BuildFeed {
  return new BuildFeed(
    new MySqlTimetableSource(databaseConnection(), databaseStream(), stationCoordinates),
    output
  );
}

const getBuildFeedCommand = once((_: null) => buildFeed(new FileOutput()));

async function getDownloadAndProcessCommand(
  directory: string,
  feed: "fares" | "routeing" | "timetable"
): Promise<DownloadAndProcessCommand> {
  return new DownloadAndProcessCommand(await getDownloadCommand(directory), getImportFeedCommand(feed));
}

/**
 * Resolve a CLI flag to the command that implements it.
 *
 * An unrecognised flag prints the help text and exits zero. That is deliberate
 * rather than a case someone forgot.
 */
export const getCommand = once(async (type: string): Promise<CLICommand> => {
  switch (type) {
    case "--fares": return getImportFeedCommand("fares");
    case "--fares-clean": return new CleanFaresCommand(databaseConnection());
    case "--routeing": return getImportFeedCommand("routeing");
    case "--timetable": return getImportFeedCommand("timetable");
    case "--nfm64": return getImportFeedCommand("nfm64");
    case "--gtfs": return getBuildFeedCommand(null);
    case "--gtfs-import": return new GTFSImportCommand(databaseConfiguration());
    case "--gtfs-zip": return new OutputGTFSZipCommand(getBuildFeedCommand(null));
    case "--download-fares": return getDownloadCommand("/fares/");
    case "--download-timetable": return getDownloadCommand("/timetable/");
    case "--download-routeing": return getDownloadCommand("/routing_guide/");
    case "--download-nfm64": return new DownloadFileCommand(downloadUrl);
    case "--get-fares": return getDownloadAndProcessCommand("/fares/", "fares");
    case "--get-timetable": return getDownloadAndProcessCommand("/timetable/", "timetable");
    case "--get-routeing": return getDownloadAndProcessCommand("/routing_guide/", "routeing");
    case "--get-nfm64": return new DownloadAndProcessCommand(
      new DownloadFileCommand(downloadUrl),
      getImportFeedCommand("nfm64")
    );
    default: return new ShowHelpCommand();
  }
});
