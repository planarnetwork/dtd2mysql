
import InitDB from "./InitDB";
import Container from "./Container";
import ImportFaresFeed from "./ImportFaresFeed";
import CleanFaresData from "./CleanFaresData";
import ImportTimetable from "./ImportTimetable";
import CleanTimetableData from "./CleanTimetableData";

export default class CLI {

    private static commands = {
        "--init-db": InitDB,
        "--fares": ImportFaresFeed,
        "--fares-clean": CleanFaresData,
        "--timetable": ImportTimetable,
        "--timetable-clean": CleanTimetableData
    };

    private static container = new Container();

    static getCommand(opt: string) {
        if (typeof this.commands[opt] !== 'function') {
            throw new Error("Unknown command: " + opt);
        }

        return new this.commands[opt](this.container);
    }

    static async runCommand(args: string[]) {
        const [node, script, opt, ...argv] = args;

        try {
            await this.getCommand(opt).run(argv);
        }
        catch (err) {
            console.error(err);
        }

        await this.container.get("database").end();
    }
}