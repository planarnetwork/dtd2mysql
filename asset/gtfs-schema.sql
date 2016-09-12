
DROP TABLE IF EXISTS `agency`;
CREATE TABLE `agency` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    agency_id VARCHAR(100),
    agency_name VARCHAR(255) NOT NULL,
    agency_url VARCHAR(255) NOT NULL,
    agency_timezone VARCHAR(100) NOT NULL,
    agency_lang VARCHAR(100),
    agency_phone VARCHAR(100),
    agency_fare_url VARCHAR(100)
);

DROP TABLE IF EXISTS `calendar_dates`;
CREATE TABLE `calendar_dates` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    service_id VARCHAR(20) NOT NULL,
    `date` DATE NOT NULL,
    exception_type TINYINT(2) NOT NULL,
    KEY `service_id` (service_id),
    KEY `exception_type` (exception_type)
);

DROP TABLE IF EXISTS `calendar`;
CREATE TABLE `calendar` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    service_id VARCHAR(26) NOT NULL,
    monday TINYINT(1) NOT NULL,
    tuesday TINYINT(1) NOT NULL,
    wednesday TINYINT(1) NOT NULL,
    thursday TINYINT(1) NOT NULL,
    friday TINYINT(1) NOT NULL,
    saturday TINYINT(1) NOT NULL,
    sunday TINYINT(1) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    KEY `service_id` (service_id),
    KEY `start_date` (`start_date`),
    KEY `end_date` (`end_date`),
    KEY `monday` (`monday`),
    KEY `tuesday` (`tuesday`),
    KEY `wednesday` (`wednesday`),
    KEY `thursday` (`thursday`),
    KEY `friday` (`friday`),
    KEY `saturday` (`saturday`),
    KEY `sunday` (`sunday`)
);

DROP TABLE IF EXISTS `fare_attributes`;
CREATE TABLE `fare_attributes` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    fare_id VARCHAR(100),
    price VARCHAR(50) NOT NULL,
    currency_type VARCHAR(50) NOT NULL,
    payment_method TINYINT(1) NOT NULL,
    transfers TINYINT(1) NOT NULL,
    transfer_duration VARCHAR(10),
    exception_type TINYINT(2) NOT NULL,
    agency_id INT(100),
    KEY `fare_id` (fare_id)
);

DROP TABLE IF EXISTS `fare_rules`;
CREATE TABLE `fare_rules` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    fare_id VARCHAR(100),
    route_id VARCHAR(100),
    origin_id VARCHAR(100),
    destination_id VARCHAR(100),
    contains_id VARCHAR(100),
    KEY `fare_id` (fare_id),
    KEY `route_id` (route_id)
);

DROP TABLE IF EXISTS `feed_info`;
CREATE TABLE `feed_info` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    feed_publisher_name VARCHAR(100),
    feed_publisher_url VARCHAR(255) NOT NULL,
    feed_lang VARCHAR(255) NOT NULL,
    feed_start_date DATE NOT NULL,
    feed_end_date DATE,
    feed_version VARCHAR(100)
);

DROP TABLE IF EXISTS `frequencies`;
CREATE TABLE `frequencies` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    trip_id INT(12) unsigned NOT NULL,
    start_time DATE NOT NULL,
    end_time DATE NOT NULL,
    headway_secs VARCHAR(100) NOT NULL,
    exact_times TINYINT(1),
    KEY `trip_id` (trip_id)
);

DROP TABLE IF EXISTS `links`;
CREATE TABLE `links` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    mode VARCHAR(50) NOT NULL,
    from_stop_id VARCHAR(20) NOT NULL,
    to_stop_id VARCHAR(20) NOT NULL,
    link_secs INT(12) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    priority INT(12) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monday TINYINT(1) NOT NULL,
    tuesday TINYINT(1) NOT NULL,
    wednesday TINYINT(1) NOT NULL,
    thursday TINYINT(1) NOT NULL,
    friday TINYINT(1) NOT NULL,
    saturday TINYINT(1) NOT NULL,
    sunday TINYINT(1) NOT NULL,
    KEY `from_stop_id` (from_stop_id),
    KEY `to_stop_id` (to_stop_id),
    KEY `start_time` (start_time),
    KEY `end_time` (end_time),
    KEY `start_date` (start_date),
    KEY `end_date` (end_date),
    KEY `monday` (`monday`),
    KEY `tuesday` (`tuesday`),
    KEY `wednesday` (`wednesday`),
    KEY `thursday` (`thursday`),
    KEY `friday` (`friday`),
    KEY `saturday` (`saturday`),
    KEY `sunday` (`sunday`)
);

DROP TABLE IF EXISTS `routes`;
CREATE TABLE `routes` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    route_id VARCHAR(100),
    agency_id VARCHAR(50),
    route_short_name VARCHAR(50) NOT NULL,
    route_long_name VARCHAR(255) NOT NULL,
    route_type VARCHAR(2) NOT NULL,
    route_text_color VARCHAR(255),
    route_color VARCHAR(255),
    route_url VARCHAR(255),
    route_desc VARCHAR(255),
    KEY `agency_id` (agency_id),
    KEY `route_type` (route_type)
);

DROP TABLE IF EXISTS `shapes`;
CREATE TABLE `shapes` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    shape_id VARCHAR(100) NOT NULL,
    shape_pt_lat DECIMAL(8,6) NOT NULL,
    shape_pt_lon DECIMAL(8,6) NOT NULL,
    shape_pt_sequence TINYINT(3) NOT NULL,
    shape_dist_traveled VARCHAR(50),
    KEY `shape_id` (shape_id)
);

DROP TABLE IF EXISTS `stop_times`;
CREATE TABLE `stop_times` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    trip_id INT(12) unsigned NOT NULL,
    arrival_time TIME NOT NULL,
    wtt_arrival_time TIME,
    arrival_time_seconds INT(100),
    departure_time TIME NOT NULL,
    wtt_departure_time TIME,
    departure_time_seconds INT(100),
    stop_id VARCHAR(20) NOT NULL,
    stop_sequence TINYINT(1) unsigned NOT NULL,
    stop_headsign VARCHAR(50),
    pickup_type VARCHAR(2),
    drop_off_type VARCHAR(2),
    shape_dist_traveled VARCHAR(50),
    platform VARCHAR(3),
    engineering_allowance TINYINT(3),
    pathing_allowance TINYINT(3),
    performance_allowance TINYINT(3),
    line VARCHAR(3),
    path VARCHAR(3),
    activity VARCHAR(3),
    KEY `trip_id` (trip_id),
    KEY `arrival_time` (arrival_time),
    KEY `departure_time` (departure_time),
    KEY `stop_id` (stop_id),
    KEY `stop_sequence` (stop_sequence)
);

DROP TABLE IF EXISTS `stops`;
CREATE TABLE `stops` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    stop_id VARCHAR(20),
    stop_code VARCHAR(50),
    stop_name VARCHAR(255) NOT NULL,
    stop_desc VARCHAR(255),
    stop_lat DECIMAL(10,6) NOT NULL,
    stop_lon DECIMAL(10,6) NOT NULL,
    zone_id VARCHAR(255),
    stop_url VARCHAR(255),
    location_type VARCHAR(2),
    parent_station VARCHAR(100),
    stop_timezone VARCHAR(50),
    wheelchair_boarding TINYINT(1),
    cate_type VARCHAR(1),
    tiploc VARCHAR(9),
    KEY `stop_id` (stop_id),
    KEY `stop_lat` (stop_lat),
    KEY `stop_lon` (stop_lon),
    KEY `parent_station` (parent_station)
);

DROP TABLE IF EXISTS `transfers`;
CREATE TABLE `transfers` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    from_stop_id VARCHAR(20) NOT NULL,
    to_stop_id VARCHAR(20) NOT NULL,
    transfer_type TINYINT(1) NOT NULL,
    min_transfer_time INT(8) NOT NULL
);

DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
    id INT(12) NOT NULL PRIMARY KEY AUTO_INCREMENT,
    transit_system VARCHAR(50) NOT NULL,
    route_id VARCHAR(100) NOT NULL,
    service_id VARCHAR(26) NOT NULL,
    trip_id INT(12) unsigned NOT NULL,
    trip_headsign VARCHAR(255),
    trip_short_name VARCHAR(255),
    direction_id TINYINT(1), #0 for one direction, 1 for another.
    block_id VARCHAR(11),
    shape_id VARCHAR(11),
    wheelchair_accessible TINYINT(1), #0 for no information, 1 for at
    # least one rider accommodated on wheel chair, 2 for no riders
    # accommodated.
    bikes_allowed TINYINT(1), #0 for no information, 1 for at least
    # one bicycle accommodated, 2 for no bicycles accommodated
    train_uid VARCHAR(10),
    train_status VARCHAR(10),
    train_category VARCHAR(10),
    train_identity VARCHAR(10),
    headcode VARCHAR(10),
    train_service_code VARCHAR(10),
    portion_id VARCHAR(10),
    power_type VARCHAR(10),
    timing_load VARCHAR(10),
    speed VARCHAR(10),
    oper_chars VARCHAR(10),
    train_class VARCHAR(10),
    sleepers VARCHAR(10),
    reservations VARCHAR(10),
    catering VARCHAR(10),
    service_branding VARCHAR(10),
    stp_indicator VARCHAR(10),
    uic_code VARCHAR(10),
    atoc_code VARCHAR(10),
    applicable_timetable VARCHAR(10),
    KEY `trip_id` (trip_id),
    KEY `service_id` (service_id),
    KEY `direction_id` (direction_id),
    KEY `block_id` (block_id),
    KEY `shape_id` (shape_id)
);
