
import {DatabaseConnection} from "../DatabaseConnection";

export class CreateSchemaCommand {

  constructor(
    private readonly db: DatabaseConnection
  ) {}

  /**
   *
   */
  public run(record: Record): Promise<any> {
    throw new Error('Method not implemented.');
  }

}