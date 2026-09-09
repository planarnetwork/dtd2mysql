---
"@gb-transit/gtfs-output": patch
---

Write each zip entry's size in its own header, so a reader never has to guess.

The previous release replaced adm-zip with fflate's streaming writer. That fixed the 2GB entry limit
and introduced a worse fault, which this fixes: fflate cannot put an entry's size in its header,
because the compressed size is not known until the entry has been compressed and the header is
written before it. So it sets the flag that says "the sizes are in a descriptor after the data", and
writes zeros.

That pushes the cost onto whoever reads it. A reader going forwards cannot know where an entry ends,
so it scans the compressed bytes for the next header's signature — and compressed bytes are
effectively random, so eventually they contain one. Merging the rail feed with the national Bus Open
Data Service feed produced exactly that: `PK\x03\x04` appearing 515MB into 684MB of compressed stop
times, which truncated the file at 2.25GB of 2.96GB for any reader that does not consult the central
directory. `unzip` was unaffected, because it reads the central directory first.

The chance is roughly `3 × compressed bytes / 2^32` per build: about 1 in 68 for today's rail feed,
about one in two for a feed with the national bus data in it. adm-zip never had it, because it
buffered each entry and so knew the sizes. Nor is it fflate's alone — yazl writes the same header for
the same reason, and BODS's own feed is the same gamble when we read it.

A writer streaming into a pipe has no choice. This one writes to a file, which can be seeked, so it
does not have to guess: the header goes down with room for the sizes and no descriptor flag, the
entry is streamed through `node:zlib`, and the twelve bytes are written back where they belong. The
crc32 comes from `zlib.crc32` over the chunks as they pass, so nothing is read twice and nothing is
held.

`@gb-transit/gtfs-output` no longer depends on fflate; it was the last thing in the package that was
not a node built-in or a workspace package. The archive is 5% smaller and marginally quicker, both
from native deflate rather than a JavaScript one, and a merged national feed's thirteen files come
out byte for byte what they were.

Two limits are now checked rather than one: an entry over 4GB, and an archive over 4GB, since a local
header's offset is four bytes as well. Both fail the build. zip64 lifts them and is now ours to write
whenever the feed needs it.
