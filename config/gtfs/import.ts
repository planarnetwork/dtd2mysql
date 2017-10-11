
export const importSQL = `
TRUNCATE \`transfers\`;
LOAD DATA LOCAL INFILE 'transfers.txt' INTO TABLE transfers FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE \`routes\`;
LOAD DATA LOCAL INFILE 'routes.txt' INTO TABLE routes FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE \`agency\`;
LOAD DATA LOCAL INFILE 'agency.txt' INTO TABLE agency FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE \`calendar\`;
LOAD DATA LOCAL INFILE 'calendar.txt' INTO TABLE calendar FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE \`calendar_dates\`;
LOAD DATA LOCAL INFILE 'calendar_dates.txt' INTO TABLE calendar_dates FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE \`trips\`;
LOAD DATA LOCAL INFILE 'trips.txt' INTO TABLE trips FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE \`links\`;
LOAD DATA LOCAL INFILE 'links.txt' INTO TABLE links FIELDS TERMINATED BY ',' IGNORE 1 LINES;

TRUNCATE \`stop_times\`;
LOAD DATA LOCAL INFILE 'stop_times.txt' INTO TABLE stop_times
FIELDS TERMINATED BY ',' 
IGNORE 1 LINES
(trip_id, @arrival_time, @departure_time, stop_id, stop_sequence, stop_headsign, pickup_type, drop_off_type, shape_dist_traveled, timepoint)
SET
arrival_time = NULLIF(@arrival_time, ''),
departure_time = NULLIF(@departure_time, '');

TRUNCATE \`stops\`;
LOAD DATA LOCAL INFILE 'stops.txt' INTO TABLE stops
FIELDS TERMINATED BY ',' 
IGNORE 1 LINES
(stop_id, stop_code, stop_name, stop_desc, @stop_lat, @stop_lon, zone_id, stop_url, location_type, parent_station, stop_timezone, wheelchair_boarding)
SET
stop_lat = NULLIF(@stop_lat, ''),
stop_lon = NULLIF(@stop_lon, '');
`;