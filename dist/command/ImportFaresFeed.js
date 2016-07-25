"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fares_1 = require("../specification/fares");
const Bluebird = require("bluebird");
const path = require("path");
const readline = require("readline");
const AdmZip = require("adm-zip");
const fs = Bluebird.promisifyAll(require("fs"));
class ImportFaresFeed {
    constructor(container) {
        this.storage = container.get("record.storage");
        this.schema = container.get("schema");
        this.logger = container.get("logger");
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof argv[0] !== "string") {
                throw new Error("Please supply the path of the fares feed zip file.");
            }
            try {
                this.logger("Truncating tables...");
                const truncatePromise = this.truncateTables();
                this.logger("Extracting files...");
                new AdmZip(argv[0]).extractAllTo(TMP_PATH);
                yield truncatePromise;
                this.logger("Importing data...");
                yield this.doImport();
                this.logger("Data imported.");
            }
            catch (err) {
                this.logger(err);
            }
        });
    }
    truncateTables() {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            for (const fileType in fares_1.default) {
                for (const record of fares_1.default[fileType].getRecordTypes()) {
                    promises.push(this.storage.truncate(record.name));
                }
            }
            yield Promise.all(promises);
        });
    }
    doImport() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield fs.readdirAsync(TMP_PATH);
            const promises = [];
            for (const filename of files) {
                const file = fares_1.default[path.extname(filename).slice(1)];
                if (!file) {
                    continue;
                }
                // that's right, I'm awaiting a promise of promises o_0
                promises.concat(yield this.processFile(file, filename));
            }
            yield Promise.all(promises);
            yield Promise.all(this.storage.flushAll());
        });
    }
    processFile(file, filename) {
        this.logger(`Processing ${filename}`);
        const promises = [];
        const readEvents = readline.createInterface({
            input: fs.createReadStream(TMP_PATH + filename)
        });
        readEvents.on("line", line => {
            if (line.substr(0, 3) === '/!!') {
                return;
            }
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
            readEvents.on('close', () => resolve(promises));
            readEvents.on('SIGINT', () => reject());
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportFaresFeed;
const TMP_PATH = "/tmp/fares-feed/";
