import * as fs from "fs";
import * as https from "https";

export class FileDownload {

  public getFile(url: string, destination: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(destination);

      https.get(url, response => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      }).on("error", err => {
        fs.unlink(destination, () => reject(err));
      });

    });
  }
}
