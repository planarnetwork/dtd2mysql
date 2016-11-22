
import Command from "./Command";
import Container from "./Container";

export default class CleanTimetableData implements Command {

    private static QUERIES = [
        "DELETE trips, stop_times FROM trips JOIN stop_times USING(trip_id) JOIN calendar USING(service_id) WHERE CURDATE() > end_date",
    ];

    private db;

    constructor(container: Container) {
        this.db = container.get("database");
    }

    async run(argv: string[]) {
        const promises = CleanTimetableData.QUERIES.map(q => this.db.query(q));

        await Promise.all(promises);
    }

}