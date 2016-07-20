
import InitDB from "./InitDB";
import Container from "./Container";
import ImportFaresFeed from "./ImportFaresFeed";
import RebuildDB from "./RebuildDB";

export default class CLI {

    private static commands = {
        "--init-db": InitDB,
        "--rebuild-db": RebuildDB,
        "--fares": ImportFaresFeed
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

        await this.getCommand(opt).run(argv);

        //await this.container.get("database").end();
    }
}