import * as flow from 'xml-flow';
import {createReadStream} from "fs";

import {ImportFeedCommand} from "./ImportFeedCommand";
import {IdmsFixedLinkRecord} from "../../config/idms/file/FixedLinks_v1.0";
import {MySQLStream} from "../database/MySQLStream";

/**
 * Imports one of the feeds
 */
export class ImportIdmsFixedLinksCommand extends ImportFeedCommand {

    /**
     * Extract the zip, set up the schema and do the inserts
     */
    public async doImport(filePath: string): Promise<void> {
        console.log(`Parsing ${filePath}`);

        await Promise.all(this.fileArray.map(file => this.setupSchema(file)));

        const file = Object.values(this.fileArray)[0];
        const tables = await this.tables(file);
        const tableStream = new MySQLStream(filePath, file, tables, true);

        const inFile = createReadStream(filePath);

        await new Promise((resolve, reject) => {
            const xmlStream: NodeJS.EventEmitter = flow(inFile);

            xmlStream.on('tag:fixedlink', async function (link: IdmsFixedLinkRecord) {
                await tableStream.write(link);
            });

            xmlStream.on('end', async () => {
                await tableStream.close();
                resolve();
            });

            xmlStream.on('error', reject);
        });
    }
}
