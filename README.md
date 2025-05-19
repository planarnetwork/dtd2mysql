# DTD2DB 

An import tool for the British rail fares, routeing and timetable feeds into a database.

Although both the timetable and fares feed are open data you will need to obtain the fares feed via the [ATOC website](http://data.atoc.org/fares-data). The formal specification for the data inside the feed also available on the [ATOC website](http://data.atoc.org/sites/all/themes/atoc/files/SP0035.pdf).

The tool supports both MySQL and Snowflake databases.

## Download / Install

### Option 1: Install from Private Repository

```bash
npm install git+https://github.com/seatfrog/dtd2db.git
```

Or add to your package.json:
```json
{
  "dependencies": {
    "dtd2db": "github:seatfrog/dtd2db"
  }
}
```

This will install the `dtd2db` command, which can be used with either MySQL or Snowflake databases by setting the `DATABASE_TYPE` environment variable.


### Option 2: Clone the repo

1. Clone the repository:
```bash
git clone git@github.com:seatfrog/dtd2db.git
cd dtd2db
```

2. Install dependencies and build:
```bash
npm install
npm run prepublishOnly
```

3. Link it locally (optional, for development):
```bash
npm link
```

4. In your project, you can then either:
   - Add it as a local dependency in your package.json:
     ```json
     {
       "dependencies": {
         "dtd2db": "file:/path/to/dtd2db"
       }
     }
     ```
   - Or install directly from the local path:
     ```bash
     npm install /path/to/dtd2db
     ```

## Database Configuration

### MySQL Configuration
Required environment variables:
```
DATABASE_TYPE=mysql
DATABASE_HOSTNAME=localhost
DATABASE_USERNAME=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=your_database
DATABASE_PORT=3306
```

### Snowflake Configuration
Required environment variables:
```
DATABASE_TYPE=snowflake
DATABASE_NAME=your_database
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_USERNAME=your_username
SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/private_key.p8
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_key_passphrase  # Optional, if your private key is encrypted
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_ROLE=your_role
```

## Usage 

All commands rely on the environment variables being set.

### Fares Import

Import the fares into a database, creating the schema if necessary. This operation is destructive and will remove any existing data.

```
dtd2db --fares /path/to/RJFAFxxx.ZIP
```

### Fares Clean 

Removes expired data and invalid fares, corrects railcard passenger quantities, adds full date entries to restriction date records. This command will occasionally fail due to a database timeout (depending on hardware), re-running the command should correct the problem.

```
dtd2db --fares-clean
```

### Timetables Import

Import the timetable information into a database, creating the schema if necessary. This operation is destructive and will remove any existing data.

```
dtd2db --timetable /path/to/RJTTFxxx.ZIP
```

### Convert to GTFS

Convert the DTD/TTIS version of the timetable (up to 3 months into the future) to GTFS. 

```
dtd2db --timetable /path/to/RJTTFxxx.ZIP
dtd2db --gtfs-zip filename-of-gtfs.zip
```

### Routing Guide Import
```
dtd2db --routeing /path/to/RJRGxxxx.ZIP
dtd2db --nfm64 /path/to/nfm64.zip
```

## Download from SFTP server

The download commands will take the latest full refresh from an SFTP server (by default the DTD server).

Requires the following environment variables:

```
SFTP_USERNAME=dtd_username
SFTP_PASSWORD=dtd_password
SFTP_HOSTNAME=dtd_hostname (this will default to dtd.atocrsp.org)
```

There is a command for each feed

```
dtd2db --download-fares /path/
dtd2db --download-timetable /path/
dtd2db --download-routeing /path/
dtd2db --download-nfm64 /path/
```

Or download and process in one command

```
dtd2db --get-fares
dtd2db --get-timetable
dtd2db --get-routeing
dtd2db --get-nfm64
```

## Notes
### null values

Values marked as all asterisks, empty spaces, or in the case of dates - zeros, are set to null. This is to preserve the integrity of the column type. For instance a route code is numerical although the data feed often uses ***** to signify any so this value is converted to null. 

### keys
Although every record format has a composite key defined in the specification an `id` field is added as the fields in the composite key are sometimes null. This is no longer supported in modern versions of MariaDB or MySQL.

### missing data
At present journey segments, class legends, rounding rules, print formats  and the fares data feed meta data are not imported. They are either deprecated or irrelevant. Raise an issue or PR if you would like them added.

### timetable format

The timetable data does not map to a relational database in a very logical fashion so all LO, LI and LT records map to a single `stop_time` table.

### GTFS feed cutoff date

Only schedule records that **start** up to 3 months into the future (using date of import as a reference point) are exported to GTFS for performance reasons.
This will cause any data after that point to be either incomplete or incorrect, as override/cancellation records after that will be ignored as well.

# Development and Testing

```
git clone git@github.com:seatfrog/dtd2db
npm install --dev
npm test
```

