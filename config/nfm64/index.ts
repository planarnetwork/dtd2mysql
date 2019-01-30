
import NFM64 from "./file/nfm64";
import {FeedConfig} from "../index";

export const nmf64DownloadUrl = "http://iblocks-rg-publication.s3-website-eu-west-1.amazonaws.com/nfm64.zip";

const specification: FeedConfig = {
  "": NFM64
};

export default specification;
