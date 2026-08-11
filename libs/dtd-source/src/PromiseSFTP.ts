import {Client, ClientSFTPCallback, ConnectConfig, FileEntry, SFTPWrapper, TransferOptions} from "ssh2";
import { promisify } from "util";
import {FeedCredentials} from "./Credentials";
import {FeedTransport} from "./FeedTransport";

/**
 * The DTD host is old and negotiates none of the defaults a current ssh2 offers,
 * so the acceptable algorithms are named explicitly. Removing any of these
 * without testing against the real host will fail at the handshake.
 */
const ALGORITHMS: ConnectConfig["algorithms"] = {
  kex: [
    "diffie-hellman-group1-sha1",
    "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384",
    "ecdh-sha2-nistp521",
    "diffie-hellman-group-exchange-sha256",
    "diffie-hellman-group14-sha1"
  ],
  cipher: [
    "3des-cbc",
    "aes128-ctr",
    "aes192-ctr",
    "aes256-ctr",
    "aes128-gcm",
    "aes128-gcm@openssh.com",
    "aes256-gcm",
    "aes256-gcm@openssh.com"
  ],
  serverHostKey: [
    "ssh-dss",
    "ssh-rsa",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521"
  ],
  hmac: [
    "hmac-sha2-256",
    "hmac-sha2-512",
    "hmac-sha1"
  ]
} as ConnectConfig["algorithms"];


/**
 * Wrapper around the ssh2 client
 */
export class PromiseSFTP implements FeedTransport {

  constructor(sftp: SFTPWrapper, client: Client) {
    this.readdir = promisify(sftp.readdir.bind(sftp));
    this.fastGet = promisify(sftp.fastGet.bind(sftp));
    this.end = client.end.bind(client);
  }

  /**
   * Connect with the credentials the environment supplies.
   */
  public static open(credentials: FeedCredentials): Promise<PromiseSFTP> {
    return PromiseSFTP.connect({...credentials, algorithms: ALGORITHMS});
  }

  /**
   * Connect to an SFTP server and return a PromiseSFTP client
   */
  public static connect(config: ConnectConfig): Promise<PromiseSFTP> {
    return new Promise<PromiseSFTP>((resolve, reject) => {
      const client = new Client();

      client.on("error", reject);
      client.on("ready", () => {
        client.sftp((err: Error | undefined, sftp: SFTPWrapper) => {
          if (err) {
            return reject(err);
          }

          resolve(new PromiseSFTP(sftp, client));
        });
      });

      client.connect(config);
    });
  }

  /**
   * Read the contents of the given directory. Promisified version of ssh2's readdir method.
   */
  public readdir: (path: string | Buffer) => Promise<FileEntry[]>;

  /**
   * Copy file from source to destination. Promisified version of ssh2's fastGet
   */
  public fastGet: (from: string, to: string, opts?: TransferOptions) => Promise<void>;

  /**
   * Close the underlying SFTP connection
   */
  public end: () => void;

}
