///<reference path="../../../node_modules/immutable/dist/immutable.d.ts"/>

import {FieldValue} from "../field/Field";
import Record from "./Record";

export default class CSVRecord extends Record {

  extractRecord(line: string): FieldValue[] {
    const fieldValues = line.split(",");
    const result = [null];

    for (let i = 0; i < fieldValues.length; i++) {
      const field = this.fields.find(f => f.position === i);

      if (field) {
        const value = field.getValue(fieldValues[i]);

        result.push(value);
      }

    }

    return result;
  }

}