
import {TextField, VariableLengthText} from "../../../src/feed/field/TextField";
import {IntField} from "../../../src/feed/field/IntField";
import {TimeField} from "../../../src/feed/field/TimeField";
import {DateField} from "../../../src/feed/field/DateField";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";
import {BooleanField} from "../../../src/feed/field/BooleanField";

import memoize = require("memoized-class-decorator");
import {Record, FieldMap, ParsedRecord, RecordAction} from "../../../src/feed/record/Record";
import {FieldValue} from "../../../src/feed/field/Field";
import {isNullOrUndefined} from "util";

/**
 * Short format DTD date (e.g. 31/05/2017)
 */
class ALFDate extends DateField {

  constructor(start: number, nullable: boolean = false) {
    super(start, nullable);
  }

  /**
   * Turn an ALF formatted date into a MySQL formatted date
   */
  protected parse(value: string): string {
    return `${value.substr(-4)}-${value.substr(3, 2)}-${value.substr(0, 2)}`;
  }

}

/**
 * The ALF file has a bizarre CSV like format with optional fields so some specific processing is required.
 */
class ALFRecord implements Record {

  private readonly fieldMap = {
    "mode": ["M"],
    "origin": ["O"],
    "destination": ["D"],
    "duration": ["T"],
    "start_time": ["S"],
    "end_time": ["E"],
    "priority": ["P"],
    "start_date": ["F"],
    "end_date": ["U"],
    "monday": ["R", 0],
    "tuesday": ["R", 1],
    "wednesday": ["R", 2],
    "thursday": ["R", 3],
    "friday": ["R", 4],
    "saturday": ["R", 5],
    "sunday": ["R", 6]
  };

  public readonly name: string = "additional_fixed_link";
  public readonly indexes: string[] = [];
  public readonly key: string[] = [];
  public readonly fields: FieldMap = {
    "mode": new VariableLengthText(1, 10),
    "origin": new TextField(2, 3),
    "destination": new TextField(3, 3),
    "duration": new IntField(4, 3, false, []),
    "start_time": new TimeField(5, 4, false),
    "end_time": new TimeField(6, 4, false),
    "priority": new IntField(7, 1),
    "start_date": new ALFDate(8, true),
    "end_date": new ALFDate(9, true),
    "monday": new BooleanField(10),
    "tuesday": new BooleanField(11),
    "wednesday": new BooleanField(12),
    "thursday": new BooleanField(13),
    "friday": new BooleanField(14),
    "saturday": new BooleanField(15),
    "sunday": new BooleanField(16)
  };

  public readonly orderedInserts: boolean = false;

  /**
   * Split the CSV string and then split the values into key pairs.
   *
   * M=TRANSFER,O=LBG,D=WAT,T=25,S=0001,E=2359,P=6,F=29/08/2017,U=01/09/2017,R=0111100
   */
  extractValues(line: string): ParsedRecord {
    const entries = <[string, string][]>line
      .trim()
      .split(",")
      .map(field => field.split("="));

    const csvMap = new Map(entries);
    const values = { id: null };
    const action = RecordAction.Insert;

    for (const [name, field] of Object.entries(this.fields)) {
      const [fieldKey, position] = this.fieldMap[name];
      const rawValue = csvMap.get(fieldKey);

      if (isNullOrUndefined(rawValue)) {
        values[name] = null;
      }
      else {
        const value = !isNullOrUndefined(position) ? rawValue.charAt(position) : rawValue;
        values[name] = field.extract(value);
      }

    }

    return { action, values };
  }

}

const ALF = new SingleRecordFile(new ALFRecord());

export default ALF;