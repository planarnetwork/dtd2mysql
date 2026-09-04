# @gb-transit/enrich-naptan

## 1.0.0

### Major Changes

- Realign the published version with the registry.

  `yarn release` published every workspace whether or not its version had moved, so a
  package with nothing to say failed the run on "cannot publish over the previously
  published versions" and took the packages that did have something to say down with it.
  Five releases died that way, from 2 September on: the registry stayed where it was while
  master went on bumping numbers that nobody could install.

  Those numbers are abandoned rather than published. Every `@gb-transit` package is
  released here at 1.0.0 - a major, because the last version installable from npm is
  0.0.0 and this is not what that number promises.

### Patch Changes

- Updated dependencies [b675f63, 2a1ca37]
  - @gb-transit/gtfs@1.0.0
