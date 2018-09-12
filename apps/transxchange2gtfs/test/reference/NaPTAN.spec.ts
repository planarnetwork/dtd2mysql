import * as chai from "chai";
import {NaPTANFactory} from "../../src/reference/NaPTAN";
import parse = require("csv-parse");

describe("NaPTANFactory", () => {

  it("indexes NaPTAN rows by ATCO code", async () => {
    const factory = new NaPTANFactory(mockZip() as any, parse());
    const index = await factory.getIndex();

    chai.expect(index["stopA"]).to.deep.equal(["stopA", "nameA"]);
    chai.expect(index["stopB"]).to.deep.equal(["stopB", "nameB"]);
  });

});

function mockZip() {
  return {
    readAsText: () => "stopA,nameA\nstopB,nameB"
  };
}

