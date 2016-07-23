
import Command from "./Command";
import files from '../specification/fares';
import Container from "./Container";
import Schema from "../storage/schema/Schema";

export default class RebuildDB implements Command {
    private schema: Schema;

    constructor(container: Container) {
        this.schema = container.get("schema");
    }

    async run(argv: string[]) {
        let results = [];

        for (const fileType in files) {
            for (const record of files[fileType].getRecordTypes()) {
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

        console.log("Database schema created");
    }

}