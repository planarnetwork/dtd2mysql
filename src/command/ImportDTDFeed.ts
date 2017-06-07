
//import files from '../specification/fares';
import Command from "./Command";
import * as Bluebird from "bluebird";
import * as path from "path";
import * as readline from "readline";
import RecordStorage from "../storage/record/RecordStorage";
import FeedFile from "../feed/file/FeedFile";
import Schema from "../storage/schema/Schema";
import AdmZip = require("adm-zip");

const fs: any = Bluebird.promisifyAll(require("fs"));

type FileMap = {
    [extension: string]: FeedFile
};

export default class ImportDTDFeed implements Command {

    constructor(private storage: RecordStorage,
                private schema: Schema,
                private logger: any,
                private tmpFolder: string,
                private files: FileMap) {}

    public async run(argv: string[]) {
        if (typeof argv[0] !== "string") {
            throw new Error("Please supply the path of the feed zip file.");
        }

        this.logger("Creating schema...");
        await this.createSchema();
        this.logger("Truncating tables...");
        const truncatePromise = this.truncateTables();
        this.logger("Extracting files...");
        new AdmZip(argv[0]).extractAllTo(this.tmpFolder);

        await truncatePromise;
        this.logger("Importing data...");
        await this.doImport();
        this.logger("Data imported.");
    }

    private async createSchema() {
        let results = [];

        for (const fileType in this.files) {
            for (const record of this.files[fileType].getRecordTypes()) {
                try {
                    await this.schema.dropSchema(record);
                    results.push(this.schema.createSchema(record));
                }
                catch (err) {
                    console.log(err);
                }
            }
        }

        try {
            await Promise.all(results);
        }
        catch (err) {
            console.log(err);
        }

        this.logger("Database schema created");
    }

    private async truncateTables() {
        const promises = [];

        for (const fileType in this.files) {
            for (const record of this.files[fileType].getRecordTypes()) {
                promises.push(this.storage.truncate(record.name));
            }
        }

        await Promise.all(promises);
    }

    private async doImport() {
        const files = await fs.readdirAsync(this.tmpFolder);
        const promises = [];

        for (const filename of files) {
            const file = this.files[path.extname(filename).slice(1)];

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
            input: fs.createReadStream(this.tmpFolder + filename)
        });

        readEvents.on("line", line => {
            if (line === '' || line.charAt(0) === '/') { return; }

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
