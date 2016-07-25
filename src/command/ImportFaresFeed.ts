
import Command from "./Command";
import Container from "./Container";
import faresFeed from "../specification/fares";
import * as Bluebird from "bluebird";
import * as path from "path";
import * as readline from "readline";
import RecordStorage from "../storage/record/RecordStorage";
import FeedFile from "../feed/file/FeedFile";
import Schema from "../storage/schema/Schema";

const AdmZip = require("adm-zip");
const fs: any = Bluebird.promisifyAll(require("fs"));
export default class ImportFaresFeed implements Command {
    private storage: RecordStorage;
    private schema: Schema;
    private logger;

    constructor(container: Container) {
        this.storage = container.get("record.storage");
        this.schema = container.get("schema");
        this.logger = container.get("logger");
    }

    async run(argv: string[]) {
        if (typeof argv[0] !== "string") {
            throw new Error("Please supply the path of the fares feed zip file.");
        }

        try {
            this.logger("Truncating tables...");
            const truncatePromise = this.truncateTables();
            this.logger("Extracting files...");
            new AdmZip(argv[0]).extractAllTo(TMP_PATH);

            await truncatePromise;
            this.logger("Importing data...");
            await this.doImport();
            this.logger("Data imported.");
        }
        catch (err) {
            this.logger(err);
        }
    }

    async truncateTables() {
        const promises = [];

        for (const fileType in faresFeed) {
            for (const record of faresFeed[fileType].getRecordTypes()) {
                promises.push(this.storage.truncate(record.name));
            }
        }

        await Promise.all(promises);
    }

    async doImport() {
        const files = await fs.readdirAsync(TMP_PATH);
        const promises = [];

        for (const filename of files) {
            const file = faresFeed[path.extname(filename).slice(1)];

            if (!file) {
                continue;
            }

            // that's right, I'm awaiting a promise of promises o_0
            promises.concat(await this.processFile(file, filename));
        }

        await Promise.all(promises);
        await Promise.all(this.storage.flushAll());
    }

    private processFile(file: FeedFile, filename: string) {
        this.logger(`Processing ${filename}`);

        const promises = [];
        const readEvents = readline.createInterface({
            input: fs.createReadStream(TMP_PATH + filename)
        });

        readEvents.on("line", line => {
            if (line.substr(0, 3) === '/!!') { return; }

            try {
                const record = file.getRecord(line);
                const data = record.extractRecord(line);
                const maybePromise = this.storage.save(record.name, data);

                if (maybePromise) {
                    promises.push(maybePromise);
                }
            }
            catch (err) {
                this.logger(`Error processing ${filename} with data ${line}`);
                this.logger(err);
            }
        });

        // return a promise that is fulfilled once the file has been read
        // the promise will contain a list of promises for each insert
        return new Promise((resolve, reject) => {
            readEvents.on('close', () => resolve(promises) );
            readEvents.on('SIGINT', () => reject());
        });
    }
}

const TMP_PATH = "/tmp/fares-feed/";
