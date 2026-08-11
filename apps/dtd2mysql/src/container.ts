import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import mysql from "mysql2";
import mysqlPromise from "mysql2/promise";
import config, {downloadUrl} from "@gb-rail/dtd-schema";
import {BuildFeed, buildContext, GTFSOutput, stationCoordinates} from "@gb-rail/gtfs";
import {FileOutput, OutputGTFSZipCommand} from "@gb-rail/gtfs-output";
import {
  DownloadAndProcessCommand,
  DownloadCommand,
  DownloadFileCommand,
  PromiseSFTP
} from "@gb-rail/dtd-source";
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
  track(mysqlPromise.createPool(poolOptions()) as unknown as DatabaseConnection)
);

const getDatabaseStream = once((_: null): mysql.Pool =>
  track(mysql.createPool(poolOptions()))
);

/**
 * Every pool this container has actually created.
 *
 * An open pool keeps the event loop alive, so a command that does not close one
 * leaves the process hanging after its work is done - harmless at a prompt,
 * fatal for a scheduled job, which waits for the workflow timeout instead of
 * finishing. The download commands were the ones that never closed it; closing
 * from here covers all of them rather than the one that was noticed.
 */
const pools: {end(...args: any[]): any}[] = [];

function track<T extends {end(...args: any[]): any}>(pool: T): T {
  pools.push(pool);

  return pool;
}

export async function closeConnections(): Promise<void> {
  // A command that closes its own pool - the GTFS build does - has already been
  // here, and mysql2 throws on a second close. Nothing to report either way.
  await Promise.all(pools.map(async pool => {
    try {
      await pool.end();
    }
    catch (err) {
      return undefined;
    }
  }));

  pools.length = 0;
}

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
    output,
    buildContext(process.argv)
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
/**
 * Every flag the CLI answers to, and what it builds.
 *
 * A map rather than a switch so it can be checked against the README without
 * being invoked. Invoking is not an option in a test: the download commands
 * open an SFTP connection as they are constructed.
 */
export const commands: {[flag: string]: () => CLICommand | Promise<CLICommand>} = {
  "--fares": () => getImportFeedCommand("fares"),
  "--fares-clean": () => new CleanFaresCommand(databaseConnection()),
  "--routeing": () => getImportFeedCommand("routeing"),
  "--timetable": () => getImportFeedCommand("timetable"),
  "--nfm64": () => getImportFeedCommand("nfm64"),
  "--gtfs": () => getBuildFeedCommand(null),
  "--gtfs-import": () => new GTFSImportCommand(databaseConfiguration()),
  "--gtfs-zip": () => new OutputGTFSZipCommand(getBuildFeedCommand(null)),
  "--download-fares": () => getDownloadCommand("/fares/"),
  "--download-timetable": () => getDownloadCommand("/timetable/"),
  "--download-routeing": () => getDownloadCommand("/routing_guide/"),
  "--download-nfm64": () => new DownloadFileCommand(downloadUrl),
  "--get-fares": () => getDownloadAndProcessCommand("/fares/", "fares"),
  "--get-timetable": () => getDownloadAndProcessCommand("/timetable/", "timetable"),
  "--get-routeing": () => getDownloadAndProcessCommand("/routing_guide/", "routeing"),
  "--get-nfm64": () => new DownloadAndProcessCommand(
    new DownloadFileCommand(downloadUrl),
    getImportFeedCommand("nfm64")
  )
};

/**
 * An unknown flag prints help and exits 0, which is friendly for a typo and
 * silent for a dropped entry - a cron job would simply stop importing. T11
 * asserts the map and the README agree, in both directions.
 */
export const getCommand = once(async (type: string): Promise<CLICommand> =>
  commands.hasOwnProperty(type) ? commands[type]() : new ShowHelpCommand()
);
