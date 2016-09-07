#UK Rail Import

A tool to extract, transform and load (ETL) UK rail data feeds. This script will extract fares, flows, locations, group stations and restrictions from the ATOC fares feed and store them in a database.

Although it is open data you will need to have obtain access via the [ATOC website](http://data.atoc.org/fares-data). The formal specification for the data inside the feed also available on the [ATOC website](http://data.atoc.org/sites/all/themes/atoc/files/SP0035.pdf).

At the moment only mysql is supported as the data store but it could be extended to support other data stores. PRs are very welcome.

##Install

You don't have to install it globally but it makes it easier if you are not going to use it as part of another project. The `-g` option usually requires `sudo`.

```
npm install -g uk-rail-import
```

You can run the application by pipping the output to mysql, or you can use the environment/profile variables. The environment variable method connects directly to mysql to import the data whereas the unix pipes just pass SQL queries around.

## Setup

### Unix pipes

SQL commands are piped from the stdout to a mysql (or other input) of your choice.

```
uk-rail-import --init-db | mysql -uusername etc
```

### Environment profile

```
export DATABASE_USERNAME=root
export DATABASE_PASSWORD=
export DATABASE_HOSTNAME=localhost
export DATABASE_NAME=fares

uk-rail-import --init-db 
```

## Run
### Unix pipes

```
uk-rail-import --fares /path/to/RJFAFxxx.ZIP | mysql -uusername etc
```

### Environment profile
```
export DATABASE_USERNAME=root
export DATABASE_PASSWORD=
export DATABASE_HOSTNAME=localhost
export DATABASE_NAME=fares

uk-rail-import --fares /path/to/RJFAFxxx.ZIP
```
## Clean
Remove historical records that no longer apply.
### Unix pipes

```
uk-rail-import --fares-clean | mysql -uusername etc
```

### Environment profile
```
export DATABASE_USERNAME=root
export DATABASE_PASSWORD=
export DATABASE_HOSTNAME=localhost
export DATABASE_NAME=fares

uk-rail-import --fares-clean
```


## Notes
### null values

Values marked as all asterisks, emtpy spaces, or in the case of dates - zeros, are set to null. This is to preverse the integrity of the column type. For instance a route code is numerical although the data feed often uses ***** to signify any so this value is converted to null. 

### keys
Although every record format has a composite key defined in the specification an `id` field is added as the fields in the composite key are sometimes null. This is no longer supported in modern versions of MariaDB or MySQL.

### missing data
At present journey segments, class legends, rounding rules, print formats  and the fares data feed meta data are not imported. They are either deprecated or irrelevant. Raise an issue or PR if you would like them added.

## Contributing

Issues and PRs are very welcome. In particular, more data stores, more flexible configuration options (config file) and the timetable feeds would be useful. 

If there is a way of automatically downloading the feed from the ATOC website that would be useful too.

The project is written in TypeScript.

## License

This software is licensed under [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.en.html).

Copyright 2016 Linus Norton.
