import {IntField} from "../../../src/feed/field/IntField";
import {TextField} from "../../../src/feed/field/TextField";
import {FixedWidthRecord} from "../../../src/feed/record/FixedWidthRecord";
import {SingleRecordFile} from "../../../src/feed/file/SingleRecordFile";

const nfm64Row = new FixedWidthRecord(
  "nfm64",
  ["origin", "destination", "route_code", "ticket_code"],
  {
    "origin": new TextField(0, 4),
    "destination": new TextField(4, 4),
    "route_code": new TextField(8, 5),
    "ticket_code": new TextField(13, 3),
    "price": new IntField(16, 6)
  }
);

const acceptedTicketTypes = ["SOS", "SDS", "CDS", "SVS"];

const filter = (line: string): boolean => {
  return acceptedTicketTypes.includes(line.substr(13, 3));
};

const NFM64 = new SingleRecordFile(nfm64Row, filter);

export default NFM64;
