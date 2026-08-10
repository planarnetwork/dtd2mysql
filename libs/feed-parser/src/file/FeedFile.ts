
import {Record} from "../record/Record";

export interface FeedFile {

  /**
   * Return all the possible return types in the file
   */
  recordTypes: Record[];

  /**
   * Return the relevant Record for the line
   */
  getRecord(line: string): Record | null;
}
