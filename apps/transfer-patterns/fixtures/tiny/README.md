# fixtures/tiny

A hand-written feed of four stations, small enough to say by hand what its transfer patterns are.

```
AAA --T1--> BBB --T1--> CCC --T2--> DDD
AAA --T3--> BBB
```

`T1` runs Ayton to Ceeton calling at Beeton, `T2` carries on from Ceeton to Deeton, and `T3` is a
second Ayton to Beeton service later in the day. So a journey from Ayton to Deeton has to change at
Ceeton, and one from Ayton to Ceeton does not have to change at all.

Every station has a three character `stop_code` and a `stop_timezone` of `Europe/London`, which is
what marks it a station rather than one of the platforms beneath it. That is the shape of the GB
rail feeds this is built for, and a feed without it is one the format cannot express.

It is committed as text and zipped by the test, so a change to it arrives as a readable diff.
