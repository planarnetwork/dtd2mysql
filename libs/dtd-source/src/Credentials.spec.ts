import {describe, it, expect} from "vitest";
import {DTD_HOST, feedCredentials} from "./Credentials";

describe("feedCredentials", () => {

  it("takes the account from the environment", () => {
    expect(feedCredentials({SFTP_USERNAME: "u", SFTP_PASSWORD: "p"}))
      .to.deep.equal({host: DTD_HOST, username: "u", password: "p"});
  });

  it("lets the host be overridden", () => {
    expect(feedCredentials({SFTP_USERNAME: "u", SFTP_PASSWORD: "p", SFTP_HOSTNAME: "example.org"}).host)
      .to.equal("example.org");
  });

  it("says where credentials come from now, rather than failing at the handshake", () => {
    // The portal that used to issue them was retired in early 2026, so someone
    // reading a bare authentication failure would go looking in the wrong place.
    expect(() => feedCredentials({})).to.throw(/raildata\.org\.uk/);
    expect(() => feedCredentials({SFTP_USERNAME: "u"})).to.throw(/SFTP_PASSWORD/);
  });

});
