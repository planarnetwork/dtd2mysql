import {CLICommand} from "./CLICommand";
import {OutputGTFSCommand} from "./OutputGTFSCommand";
const express = require("express");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");
const stream = require("stream");
const AWS = require("aws-sdk");

export class WebServerCommand implements CLICommand {
  constructor(
    private gtfsCommandSupplier: (startRange, endRange) => OutputGTFSCommand
  ) {}

  async run(argv: string[]) {
    if (!(argv[3] && argv[4])) {
      console.log(
        "Incorrect parameters, usage is `dtd2mysql --gtfs-server [working directory] [default s3 upload bucket]`"
      );
      process.exitCode = 1;
      return;
    }
    let app = express();
    let inProgress = false;
    let s3 = new AWS.S3();
    let s3BucketName = argv[4];
    let fileName: string;

    app.get("", async (req, res) => {
      if (!inProgress) {
        inProgress = true;
        res.writeProcessing();

        let startRange = req.query["start"];
        let endRange = req.query["end"];

        fileName =
          req.query["filename"] || `gtfs-${startRange}-${endRange}.zip`;
        if (!(startRange && endRange)) {
          res.sendStatus(400);
          inProgress = false;
          return;
        }
        console.log(
          `Processing with params, startRange:${startRange}, endRange: ${endRange}, filename: ${fileName}`
        );
        let gtfsCommand = this.gtfsCommandSupplier(startRange, endRange);
        res.status(201).send({
          filename: fileName
        });
        await gtfsCommand.run(argv);
        let baseDir = gtfsCommand.baseDir;
        const archive = archiver("zip", {zlib: {level: 9}});

        const passthrough = new stream.PassThrough();
        passthrough.on("data", () => {
          res.writeProcessing();
        });

        let s3Params = {
          Bucket: s3BucketName,
          Key: fileName,
          Body: passthrough
        };

        s3.upload(s3Params, (err, data) => {
          if (err) {
            console.log(err);
            res.status(500).send(err);
          } else {
            console.log(`Uploaded gtfs file to ${s3BucketName}/${fileName}`);
          }
          fs.readdir(baseDir, (err, files) => {
            if (err) throw err;

            for (const file of files) {
              fs.unlink(path.join(baseDir, file), err => {
                if (err) throw err;
              });
            }
          });
          inProgress = false;
        });

        archive.directory(baseDir, false).pipe(passthrough);
        // finalize the archive (ie we are done appending files but streams have to finish yet)
        archive.finalize();
      } else {
        res.status(202).send("Already processing file: " + fileName);
      }
    });

    return new Promise(res => {
      app.listen(3000);
    });
  }
}
