# @gb-transit/gtfs-output

Writers for a GTFS feed: a directory of text files, or a zip.

```
npm install @gb-transit/gtfs-output
```

`@gb-transit/gtfs` builds a feed through a `GTFSOutput` interface and does not know where it lands.
This package is the two implementations of that interface, and nothing else.

## Usage

A directory of text files:

```ts
import {FileOutput} from "@gb-transit/gtfs-output";
import {BuildFeed} from "@gb-transit/gtfs";

const feed = new BuildFeed(source, new FileOutput(), context);

await feed.build("./gtfs");
```

A zip, by wrapping the same build:

```ts
import {FileOutput, OutputGTFSZipCommand} from "@gb-transit/gtfs-output";

const feed = new BuildFeed(source, new FileOutput(), context);

await new OutputGTFSZipCommand(feed).build("gtfs.zip");
```

The zip command builds into a temporary directory and compresses the result, so both paths produce
the same bytes for the same feed.

## The interface

```ts
interface GTFSOutput {
  open(filename: string): Writable;
  write(filename: string, contents: string): void | Promise<void>;
  end(): void | Promise<void>;
}
```

`open` is for the row-per-line files the build streams into; `write` is for the things that are not
rows, such as the provenance record an enriched build publishes.

## Contributing

Issues, pull requests and the source live at
[planarnetwork/dtd2mysql](https://github.com/planarnetwork/dtd2mysql). This is `libs/gtfs-output`
in that repository.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2017 Linus Norton.
