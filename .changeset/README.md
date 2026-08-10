# Changesets

`npm version patch` on every push to master cannot work across six packages, so
versioning goes through [changesets](https://github.com/changesets/changesets).

Any change that should reach a user needs a changeset. Run:

```
yarn changeset
```

pick the packages it affects and the bump type, and commit the generated markdown
file alongside your change. A pull request with no changeset publishes nothing,
which is the intended behaviour for documentation and CI-only changes.

On master, the release workflow opens a "Version Packages" pull request that
applies every pending changeset. Merging that pull request is what publishes.
Nothing is versioned before a successful publish, so a failed release no longer
burns a version number and pushes a tag for something that never shipped.
