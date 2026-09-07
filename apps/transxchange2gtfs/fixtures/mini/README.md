# The mini fixture

`mini.xml` is a hand-written TransXChange 2.4 document — one bus service in
Bristol, four stops, three vehicle journeys — and `golden/` is the feed it
produces.

It is written rather than sliced out of a real Bus Open Data Service download.
That was the first choice, and the trade is worth stating: a real slice would
carry shapes a hand-written file will not think to include, but it would also
carry a provenance and a licence to track, and 90% of the elements in it would be
there for no reason anybody could name later. Every element here is here for a
reason, and the table below says which. If a real defect turns up that this
cannot reproduce, take the BODS slice then — it is Open Government Licence v3.0,
so it may be redistributed with attribution, and the attribution belongs in this
file and in the feed's `attributions.txt`.

The stop identifiers are real Bristol ATCO codes, and `naptan.csv` carries the
four NaPTAN rows for them, so the conversion runs offline. Without it the tool
downloads the ~100MB national dataset, which is not something a test should do.

| Element | What it covers |
|---|---|
| Two `<Line>`s on one `<Service>` | TransXChange lets a service carry several lines; GTFS has no such idea, so each becomes a route. |
| `L2`'s description | Contains a comma, so the writer has to quote it. |
| `VJ1` `<Operational><Block>` | `block_id` on a trip, which a rail feed never has. |
| `VJ2` `<VehicleJourneyTimingLink>` | Overrides `JPTL1`'s run time from 4 minutes to 7. Nothing else reaches the timing-link inheritance path. |
| `VJ3` `<DaysOfWeek><Saturday/>` | A journey whose operating profile differs from its service's, so it gets a calendar of its own. |
| Service `<BankHolidayOperation>` | Christmas Day and Boxing Day as `calendar_dates.txt` exclusions, resolved through `date-holidays` rather than a list in the source. |
| `VJ1` `<SpecialDaysOperation>` | A single excluded date. |
| `VJ3` `<SpecialDaysOperation>` | A single added date. |
| `RL1` `<Track>` with three points | A shape whose measured length is scaled to the declared `<Distance>`. |
| `RL3`'s repeated `<Location>` | Two consecutive identical points, which must not become two shape points. |
| `<Activity>pickUp` and `setDown` | `pickup_type` and `drop_off_type` on the first and last calls. |
| `<TimingStatus>PTP` and `OTH` | `timepoint` 1 and 0. |
| NaPTAN `Temple Meads Station` | An `->NE` indicator, whose arrow is dropped, and a street worth appending. |
| NaPTAN `Victoria Street` | A name that already contains its street, so the street is not appended twice. |

`nested.zip` is `mini.xml` inside a zip inside a zip, which is the shape a BODS
download arrives in, and is the only thing covering `FileStream`'s recursion.

There is no `feed_info.txt` in the golden: TransXChange carries nothing to build
one from, and inventing a publisher and a version would be worse than the
validator warning about its absence.
