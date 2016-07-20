
import Record from "../../feed/record/Record";

interface Schema {

    createSchema(record: Record);
    dropSchema(record: Record);
}

export default Schema;