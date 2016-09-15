
import Command from "./Command";
import Container from "./Container";

const ACCEPTED_RAILCARDS = "'','YNG','DIS','DIC','FAM','HMF','NGC','NEW','SRN','2TR','GS3','JCP'";

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
        `DELETE FROM railcard WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS})`,
        `DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS})`,
        "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='YNG'",
        "UPDATE railcard SET min_adults=1, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='DIS'",
        "UPDATE railcard SET min_adults=1, max_adults=1, min_children=1, max_children=1, max_passengers=2 WHERE railcard_code='DIC'",
        "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='FAM'",
        "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='HMF'",
        "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NGC'",
        "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NEW'",
        "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='SRN'",
        "UPDATE railcard SET min_adults=2, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='2TR'",
        "UPDATE railcard SET min_adults=3, max_adults=9, min_children=0, max_children=0, max_passengers=9 WHERE railcard_code='GS3'",
        "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='JCP'",
        "UPDATE railcard SET min_adults=0, max_adults=9, min_children=9, max_children=0, max_passengers=9 WHERE railcard_code=''",
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