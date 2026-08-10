# Changesets

Versioning goes through [changesets](https://github.com/changesets/changesets), because
`npm version patch` on every push to master cannot work across a workspace.

Any change that should reach a user needs a changeset. Run:

```
yarn changeset
```

pick the packages it affects and the bump type, and commit the generated markdown
file alongside your change. A pull request with no changeset publishes nothing,
which is the intended behaviour for documentation and CI-only changes.

On master, the release workflow opens a "Version Packages" pull request that applies
every pending changeset. Merging that pull request is what publishes, so a failed
release cannot burn a version number or tag something that never shipped.

`dtd2mysql` is the only package published; the libraries are private and bundled into
its tarball.
