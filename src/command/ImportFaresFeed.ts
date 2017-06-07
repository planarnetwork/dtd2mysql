
import Command from "./Command";
import files from "../specification/fares";
import ImportDTDFeed from "./ImportDTDFeed";
import Container from "./Container";

export default class ImportFaresFeed implements Command {

    constructor(private readonly container: Container) {}

  /**
   * Create a DTD feed importor with the fares specification
   */
  public run(argv: string[]): Promise<any> {
        const feedProcessor = new ImportDTDFeed(
            this.container.get("record.storage"),
            this.container.get("schema"),
            this.container.get("logger"),
            "/tmp/fares-feed/",
            files
        );

        return feedProcessor.run(argv);
    }

}