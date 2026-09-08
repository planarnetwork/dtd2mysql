---
"@gb-transit/gtfs-output": minor
---

Write the feed's zip as a stream, so a feed larger than 2GB can be published.

`writeZip` used adm-zip, which assembles the whole archive in memory and refuses any entry over
2GB. A rail feed is nowhere near that. A feed with bus stop times in it is: merging
`gtfs.zip` with the Bus Open Data Service's national feed produces a `stop_times.txt` of 2.96GB, and
the merge ended

```
Writing merged.zip
File size (2955798571) is greater than 2 GiB
```

after three minutes of work, with the feed built and nowhere to put it.

It now streams each file into the archive through fflate, which the reader and four other packages
here already use. Writing the 3.05GB feed above takes 81 seconds and 116MB of memory, and the result
is a valid archive whose contents are byte for byte the directory it came from.

Two limits remain, and both are now explicit rather than discovered:

- fflate writes an entry's size into four bytes and does not check that it fits, so a file over 4GB
  would produce an archive that decompresses to the wrong thing with no error at all. The sizes are
  checked before anything is written, and a file too large to describe fails the build with the name
  and the size in the message. zip64, which fflate does not write, is what lifts this.
- Every entry is now stamped with a fixed date rather than the modification time of the file it came
  from, so two builds of the same feed produce the same bytes. They did not before: the files a feed
  is built from are written afresh by every build.
