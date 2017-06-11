
import {Field, FieldValue} from "../field/Field";

export interface Record {

  name: string;
  key: string[];
  fields: FieldMap;
  indexes: string[];

  /**
   * Turn the given line into a list of values
   */
  extractValues(line: string): FieldValue[];

}

export type FieldMap = {
  [field: string]: Field
};