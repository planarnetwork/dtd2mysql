TRUNCATE `transfers`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/transfers.txt' INTO TABLE transfers FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE `routes`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/routes.txt' INTO TABLE routes FIELDS TERMINATED BY ','  OPTIONALLY ENCLOSED BY '"' IGNORE 1 LINES;
TRUNCATE `agency`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/agency.txt' INTO TABLE agency FIELDS TERMINATED BY ','  OPTIONALLY ENCLOSED BY '"' IGNORE 1 LINES;
TRUNCATE `calendar`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/calendar.txt' INTO TABLE calendar FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE `calendar_dates`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/calendar_dates.txt' INTO TABLE calendar_dates FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE `trips`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/trips.txt' INTO TABLE trips FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE `stop_times`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/stop_times.txt' INTO TABLE stop_times FIELDS TERMINATED BY ',' IGNORE 1 LINES;

TRUNCATE `stops`;
LOAD DATA LOCAL INFILE '/tmp/transxchange2gtfs/stops.txt' INTO TABLE stops
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
IGNORE 1 LINES
(stop_id, @stop_code, stop_name, stop_desc, stop_lat, stop_lon, zone_id, stop_url, location_type, parent_station, stop_timezone, wheelchair_boarding)
SET stop_code = NULLIF(@stop_code, '');
