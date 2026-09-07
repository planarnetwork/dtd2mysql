import {NaPTANFactory} from "../../src/reference/NaPTAN";
import { parse } from "csv-parse";

describe("NaPTANFactory", () => {

  it("indexes NaPTAN rows by ATCO code", async () => {
    const input = parse();
    const factory = new NaPTANFactory(input);

    input.write("stopA,nameA\nstopB,nameB");
    input.end();

    const [index] = await factory.getIndexes();

    expect(index["stopA"]).to.deep.equal(["stopA", "nameA"]);
    expect(index["stopB"]).to.deep.equal(["stopB", "nameB"]);
  });

});

