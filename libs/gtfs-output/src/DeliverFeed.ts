import * as fs from "fs";
import * as path from "node:path";
import {writeZip} from "./WriteZip";

/**
 * Somewhere to build a feed that can become `output` without crossing a
 * filesystem.
 *
 * A sibling of the output rather than the system temporary directory, because
 * `/tmp` is very often a different device - tmpfs against the disk the work is
 * on - and `rename` cannot cross one. Building beside the destination means the
 * move is a rename on the same filesystem, which is both atomic and incapable of
 * failing halfway.
 */
export function workingDirectory(output: string): string {
  const resolved = path.resolve(output);

  return path.join(
    path.dirname(resolved),
    `.${path.basename(resolved)}.building-${process.pid}`
  );
}

/**
 * Put the feed built in `work` at `output`, as a zip or as a directory.
 *
 * Nothing at `output` is touched until the feed exists. The order matters: this
 * used to remove the output first and then rename into place, so a rename that
 * failed - which it did, every time the two were on different filesystems - left
 * the caller with neither their old directory nor a new feed.
 */
export async function deliverFeed(work: string, output: string): Promise<void> {
  if (output.endsWith(".zip")) {
    await writeZip(work, output);
    fs.rmSync(work, {recursive: true, force: true});

    return;
  }

  const resolved = path.resolve(output);

  if (fs.existsSync(resolved)) {
    // Move it aside rather than delete it, so a failure below leaves something
    // to go back to.
    const aside = `${resolved}.replaced-${process.pid}`;

    fs.renameSync(resolved, aside);

    try {
      move(work, resolved);
    }
    catch (err) {
      fs.renameSync(aside, resolved);
      throw err;
    }

    fs.rmSync(aside, {recursive: true, force: true});

    return;
  }

  move(work, resolved);
}

/**
 * A rename, or a copy where the two are on different filesystems.
 *
 * `workingDirectory` puts the two together so the rename works, but a caller
 * that chose its own working directory - `--tmp`, or a test - may have put them
 * apart.
 */
function move(from: string, to: string): void {
  try {
    fs.renameSync(from, to);
  }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EXDEV") {
      throw err;
    }

    fs.cpSync(from, to, {recursive: true});
    fs.rmSync(from, {recursive: true, force: true});
  }
}
