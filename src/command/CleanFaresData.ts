
import Command from "./Command";
import Container from "./Container";

export default class CleanFaresData implements Command {

    private static QUERIES = [
        "DELETE FROM fare WHERE fare < 50",
        "DELETE FROM flow WHERE usage_code = 'G'",
        "DELETE FROM flow WHERE flow_id NOT IN (SELECT flow_id FROM fare)",
        "DELETE FROM location WHERE end_date < CURDATE()",
        "DELETE FROM non_derivable_fare WHERE end_date < CURDATE() OR composite_indicator != 'Y' OR adult_fare < 50 OR child_fare < 50",
        "UPDATE non_derivable_fare SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare > 999999",
        "UPDATE non_derivable_fare SET child_fare = null WHERE child_fare = 99999 OR child_fare > 999999",
        "DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE() OR composite_indicator != 'Y' OR adult_fare < 50 OR child_fare < 50",
        "UPDATE non_derivable_fare_override SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare > 999999",
        "UPDATE non_derivable_fare_override SET child_fare = null WHERE child_fare = 99999 OR child_fare > 999999",
        "DELETE FROM non_standard_discount WHERE end_date < CURDATE()",
        "DELETE FROM railcard WHERE end_date < CURDATE()",
        "DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE()",
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