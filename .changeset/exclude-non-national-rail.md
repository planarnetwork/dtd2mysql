---
"@gb-transit/gtfs": minor
"cif2gtfs": minor
---

Leave the services National Rail does not run out of a feed, when a config asks.

The CIF is the National Rail timetable and it carries services National Rail does not hold
authority over: the tube, the Tyne & Wear Metro, the ferries and the scheduled buses. A feed
combined with other sources has better answers for those elsewhere — TfL names the NaPTAN stop a
replacement bus calls at and the letter route code it runs under, neither of which the CIF has — so
publishing them here describes the same journey worse.

A build config can now say what to leave out:

```yaml
exclude:
  modes: [metro, bus, ship]     # replacement buses are their own mode and stay
  operators: [ES, LT, TW, ZZ]   # everything they run, replacement buses included
  replacementBuses: [LO, XR]    # only their replacement buses; the trains stay
```

Three lists rather than one switch, because they are three questions. The operators are a blacklist
so that a National Rail operator this build has never heard of is published rather than silently
dropped, and the mode rule cannot say what the operator rule does: a London Underground replacement
bus is a replacement bus, and TfL is the one publishing it. Every list is empty unless a config says
otherwise, so a build that says nothing about this produces the feed it always did.

Config only. Everything else a build decides is a single value that a flag or an environment
variable could also say; these are three lists of codes.

`@gb-transit/gtfs` gains `excludeServices`, `ServiceExclusions`, `NO_EXCLUSIONS` and `MODES`. The
schedules are dropped after the overlays are applied, so a train replaced on some days by a service
the rules exclude does not come back on those days, and before the associations, which leaves no
coupling naming a trip the feed does not publish.

The nightly publishes a third feed, `gtfs-national-rail-only.zip`, built from
`gtfs.national-rail-only.config.yaml` with all three rules on. `gtfs.zip` and
`gtfs-passing-points.zip` are unchanged.
