#UK Rail Import

A tool to extract, transform and load (ETL) UK rail data feeds. This script will extract fares, flows, locations, group stations and restrictions from the ATOC fares feed and store them in a database.

Although it is open data you will need to have obtain access via the [ATOC website](http://data.atoc.org/fares-data). The formal specification for the data inside the feed also available on the [ATOC website](http://data.atoc.org/sites/all/themes/atoc/files/SP0035.pdf).

At the moment only mysql is supported as the data store but it could be extended to support other data stores. PRs are very welcome.

##Install

You don't have to install it globally but it makes it easier if you are not going to use it as part of another project. The `-g` option usually requires `sudo`.

```
npm install -g uk-rail-import
```

## Setup

To prepare the database you will need to export some configuration settings for your environment.

```
export DATABASE_USERNAME=root
export DATABASE_PASSWORD=
export DATABASE_HOSTNAME=localhost
export DATABASE_NAME=fares

uk-rail-import --init-db 
```

## Run

Those environment variables will also be needed when running the import

```
export DATABASE_USERNAME=root
export DATABASE_PASSWORD=
export DATABASE_HOSTNAME=localhost
export DATABASE_NAME=fares

uk-rail-import --fares /path/to/RJFAFxxx.ZIP
```
## Notes

Although every record format has a composite key defined in the specification an `id` field is added as the fields in the composite key are sometimes null. This is no longer supported in modern versions of MariaDB or MySQL.

## Contributing

Issues and PRs are very welcome. In particular, more data stores, more flexible configuration options (config file) and the timetable feeds would be useful. 

If there is a way of automatically downloading the feed from the ATOC website that would be useful too.

The project is written in TypeScript.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2016 Linus Norton.
