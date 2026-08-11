---
"dtd2mysql": patch
---

Say where feed credentials come from, and make the transport replaceable.

The National Rail open data portal was retired in early 2026 and an account for
the Timetable and Fares feeds now comes from Rail Data Marketplace. The SFTP
host is unchanged, so only issuance moved - but a missing variable failed at the
handshake with nothing to suggest the portal you were looking at no longer
exists. It now names raildata.org.uk, and so does the README.

`DownloadCommand` depends on a `FeedTransport` that lists and fetches, rather
than on the SFTP client, so a Rail Data Marketplace API implementation can be
added without touching it.
