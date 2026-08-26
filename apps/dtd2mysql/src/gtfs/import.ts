
/**
 * Load a feed this project built back into MySQL.
 *
 * A column list is in the order the *file* has its fields, not the order the
 * table declares its columns - LOAD DATA matches them by position, so a list
 * written from the table silently loads every field into the wrong column. The
 * files whose two orders happen to agree are loaded without a list.
 *
 * An absent value is an empty field rather than \\N, so a column that can be
 * absent is read into a variable and NULLIF'd. Without that a missing date
 * lands as 0000-00-00 and a missing day flag as 0, which reads as "does not run
 * on Monday" rather than "no link to describe".
 */
export const importSQL = `
TRUNCATE transfers;
LOAD DATA LOCAL INFILE 'transfers.txt' INTO TABLE transfers
FIELDS TERMINATED BY ','
IGNORE 1 LINES
(from_stop_id, to_stop_id, transfer_type, min_transfer_time,
 @mode, @start_time, @end_time, @start_date, @end_date,
 @monday, @tuesday, @wednesday, @thursday, @friday, @saturday, @sunday)
SET mode = NULLIF(@mode, ''),
    start_time = NULLIF(@start_time, ''),
    end_time = NULLIF(@end_time, ''),
    start_date = NULLIF(@start_date, ''),
    end_date = NULLIF(@end_date, ''),
    monday = NULLIF(@monday, ''),
    tuesday = NULLIF(@tuesday, ''),
    wednesday = NULLIF(@wednesday, ''),
    thursday = NULLIF(@thursday, ''),
    friday = NULLIF(@friday, ''),
    saturday = NULLIF(@saturday, ''),
    sunday = NULLIF(@sunday, '');
TRUNCATE routes;
LOAD DATA LOCAL INFILE 'routes.txt' INTO TABLE routes FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE agency;
LOAD DATA LOCAL INFILE 'agency.txt' INTO TABLE agency FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE calendar;
LOAD DATA LOCAL INFILE 'calendar.txt' INTO TABLE calendar FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE calendar_dates;
LOAD DATA LOCAL INFILE 'calendar_dates.txt' INTO TABLE calendar_dates FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE trips;
LOAD DATA LOCAL INFILE 'trips.txt' INTO TABLE trips FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE feed_info;
LOAD DATA LOCAL INFILE 'feed_info.txt' INTO TABLE feed_info FIELDS TERMINATED BY ',' IGNORE 1 LINES;
TRUNCATE attributions;
LOAD DATA LOCAL INFILE 'attributions.txt' INTO TABLE attributions
FIELDS TERMINATED BY ','
IGNORE 1 LINES
(organization_name, is_producer, is_operator, is_authority, @attribution_url, attribution_licence)
SET attribution_url = NULLIF(@attribution_url, '');

TRUNCATE stop_times;
LOAD DATA LOCAL INFILE 'stop_times.txt' INTO TABLE stop_times FIELDS TERMINATED BY ',' IGNORE 1 LINES;


TRUNCATE stops;
LOAD DATA LOCAL INFILE 'stops.txt' INTO TABLE stops
FIELDS TERMINATED BY ','
IGNORE 1 LINES
(stop_id, @stop_code, stop_name, stop_desc, zone_id, stop_url, location_type,
 @parent_station, @platform_code, stop_timezone, wheelchair_boarding, stop_lon, stop_lat)
SET stop_code = NULLIF(@stop_code, ''),
    parent_station = NULLIF(@parent_station, ''),
    platform_code = NULLIF(@platform_code, '');
`;
