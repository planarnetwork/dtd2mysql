// NaPTAN: the DfT's national dataset of every public transport access point in
// Great Britain, which is what both a rail feed and a bus feed need to say where
// a stop actually is.
//
// Reading it needs nothing but a CSV parser, so this package depends on nothing
// else. What each consumer does with a row differs - the rail enricher wants the
// RLY records reduced to a coordinate per TIPLOC, a TransXChange conversion wants
// every stop it references - and that belongs with the consumer.

export {naptanCsv, naptanFile, NAPTAN_CSV_URL} from "./NaptanCsv";
export {eachNaptanRow, parseNaptanRows} from "./NaptanRow";
export type {NaptanRow} from "./NaptanRow";
