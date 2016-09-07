
import Command from "./Command";
import Container from "./Container";

export default class CleanFaresData implements Command {

    private static QUERIES = [
        "DELETE FROM flow WHERE flow_id not in (SELECT flow_id FROM fare);",
        "DELETE FROM location WHERE end_date < CURDATE();",
        "DELETE FROM non_derivable_fare WHERE end_date < CURDATE() OR composite_indicator != 'Y';",
        "DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE() OR composite_indicator != 'Y';",
        "DELETE FROM non_standard_discount WHERE end_date < CURDATE();",
        "DELETE FROM railcard WHERE end_date < CURDATE();",
        "DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE();",
    ];

    private db;

    constructor(container: Container) {
        this.db = container.get("database");
    }

    async run(argv: string[]) {
        const promises = CleanFaresData.QUERIES.map(this.db.query);

        await Promise.all(promises);
    }

}