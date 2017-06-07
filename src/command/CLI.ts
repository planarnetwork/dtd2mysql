
import InitDB from "./InitDB";
import Container from "./Container";
import ImportFaresFeed from "./ImportFaresFeed";
import CleanFaresData from "./CleanFaresData";
import ImportTimetable from "./ImportTimetable";
import CleanTimetableData from "./CleanTimetableData";
import ImportRouteingGuide from "./ImportRouteingGuide";

export default class CLI {

    private static commands = {
        "--init-db": InitDB,
        "--fares": ImportFaresFeed,
        "--fares-clean": CleanFaresData,
        "--routeing": ImportRouteingGuide,
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

    static runCommand(args: string[]) {
        const [node, script, opt, ...argv] = args;

        this.getCommand(opt).run(argv)
            .then(_ => this.container.get("database").end())
            .catch(err => {
                console.error(err);
                this.container.get("database").end()
        });
    }
}