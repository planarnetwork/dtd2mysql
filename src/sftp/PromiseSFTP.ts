import { Client, ConnectConfig, FileEntry, SFTPWrapper, TransferOptions } from "ssh2";
import { promisify } from "util";


/**
 * Wrapper around the ssh2 client
 */
export class PromiseSFTP {

  constructor(sftp: SFTPWrapper, client: Client) {
    this.readdir = promisify(sftp.readdir.bind(sftp));
    this.fastGet = promisify(sftp.fastGet.bind(sftp));
    this.end = client.end.bind(client);
  }

  /**
   * Connect to an SFTP server and return a PromiseSFTP client
   */
  public static connect(config: ConnectConfig): Promise<PromiseSFTP> {
    return new Promise<PromiseSFTP>((resolve, reject) => {
      const client = new Client();

      client.on("error", reject);
      client.on("ready", () => {
        client.sftp((err: Error, sftp: SFTPWrapper) => {
          if (err) {
            reject(err);
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
