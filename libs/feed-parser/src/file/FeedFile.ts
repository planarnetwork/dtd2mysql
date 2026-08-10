
import {Record} from "../record/Record";

/**
 * True if the line is a record rather than something the file wraps its records
 * in, such as a header or a footer.
 */
export type RecordFilter = (line: string) => boolean;

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
