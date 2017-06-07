
import Command from "./Command";
import Container from "./Container";
import ImportDTDFeed from "./ImportDTDFeed";
import files from "../specification/routeing";

export default class ImportRouteingGuide implements Command {

  constructor(private readonly container: Container) {}

  /**
   * Create a DTD feed importer with the routeing guide specification
   */
  public run(argv: string[]): Promise<any> {
    const feedProcessor = new ImportDTDFeed(
      this.container.get("record.storage"),
      this.container.get("schema"),
      this.container.get("logger"),
      "/tmp/routeing-guide/",
      files
    );

    return feedProcessor.run(argv);
  }

}