import * as fs from "fs";
import {S3} from "aws-sdk";
import {CLICommand} from "./CLICommand";

export class DownloadFileFromS3Command implements CLICommand {

    constructor(
        private readonly s3: S3,
        private readonly bucket: string,
        private readonly name: string,
    ) {
    }

    /**
     * Download the file from a HTTP server
     */
    public async run(argv: string[]): Promise<string[]> {
        const outputDirectory = argv[3] || "/tmp/";
        const filename = outputDirectory + this.name;

        console.log(`Downloading S3 file ${this.bucket}/${this.name} to ${filename}...`);

        const stream = await this.s3.getObject({Bucket: this.bucket, Key: this.name}).createReadStream();
        const file = fs.createWriteStream(filename);

        return await new Promise((resolve, reject) => {
            stream.pipe(file);

            stream.on('end', () => {
                file.close();
                resolve([filename])
            });
            stream.on('error', reject);
        });
    }
}
