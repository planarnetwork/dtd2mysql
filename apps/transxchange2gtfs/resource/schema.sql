DROP TABLE IF EXISTS `agency`;
CREATE TABLE `agency` (
  `agency_id` varchar(255) NOT NULL,
  `agency_name` varchar(255) NOT NULL,
  `agency_url` varchar(255) NOT NULL,
  `agency_timezone` varchar(100) NOT NULL,
  `agency_lang` varchar(100) DEFAULT NULL,
  `agency_phone` varchar(100) DEFAULT NULL,
  `agency_fare_url` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`agency_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `calendar`;
CREATE TABLE `calendar` (
  `service_id` smallint(12) unsigned NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  PRIMARY KEY (`service_id`),
  KEY `start_date` (`start_date`),
  KEY `end_date` (`end_date`),
  KEY `monday` (`monday`),
  KEY `tuesday` (`tuesday`),
  KEY `wednesday` (`wednesday`),
  KEY `thursday` (`thursday`),
  KEY `friday` (`friday`),
  KEY `saturday` (`saturday`),
  KEY `sunday` (`sunday`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `calendar_dates`;
CREATE TABLE `calendar_dates` (
  `service_id` smallint(12) unsigned NOT NULL,
  `date` date NOT NULL,
  `exception_type` tinyint(2) unsigned NOT NULL,
  PRIMARY KEY (`service_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `fare_attributes`;
CREATE TABLE `fare_attributes` (
  `fare_id` varchar(100) NOT NULL,
  `price` varchar(50) NOT NULL,
  `currency_type` varchar(50) NOT NULL,
  `payment_method` tinyint(1) unsigned NOT NULL,
  `transfers` tinyint(1) unsigned NOT NULL,
  `transfer_duration` varchar(10) DEFAULT NULL,
  `exception_type` tinyint(2) unsigned NOT NULL,
  `agency_id` int(12) unsigned DEFAULT NULL,
  PRIMARY KEY (`fare_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `fare_rules`;
CREATE TABLE `fare_rules` (
  `fare_id` varchar(100) NOT NULL,
  `route_id` varchar(255) NOT NULL,
  `origin_id` varchar(100) DEFAULT NULL,
  `destination_id` varchar(100) DEFAULT NULL,
  `contains_id` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`fare_id`, `route_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `feed_info`;
CREATE TABLE `feed_info` (
  `feed_publisher_name` varchar(100) DEFAULT NULL,
  `feed_publisher_url` varchar(255) NOT NULL,
  `feed_lang` varchar(255) NOT NULL,
  `feed_start_date` date NOT NULL,
  `feed_end_date` date DEFAULT NULL,
  `feed_version` varchar(10) NOT NULL,
  PRIMARY KEY (`feed_version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


DROP TABLE IF EXISTS `frequencies`;
CREATE TABLE `frequencies` (
  `trip_id` mediumint(12) unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `headway_secs` smallint(5) NOT NULL,
  `exact_times` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`trip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `links`;
CREATE TABLE `links` (
  `from_stop_id` varchar(255) NOT NULL,
  `to_stop_id` varchar(255) NOT NULL,
  `mode` VARCHAR (15) NOT NULL,
  `duration` smallint(8) unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `routes`;
CREATE TABLE `routes` (
  `route_id` varchar(255) NOT NULL,
  `agency_id` varchar(255) DEFAULT NULL,
  `route_short_name` varchar(50) NOT NULL,
  `route_long_name` varchar(255) NOT NULL,
  `route_type` mediumint(12) unsigned NOT NULL,
  `route_text_color` varchar(255) DEFAULT NULL,
  `route_color` varchar(255) DEFAULT NULL,
  `route_url` varchar(255) DEFAULT NULL,
  `route_desc` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`route_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `shapes`;
CREATE TABLE `shapes` (
  `shape_id` smallint(12) unsigned NOT NULL,
  `shape_pt_lat` decimal(8,6) NOT NULL,
  `shape_pt_lon` decimal(8,6) NOT NULL,
  `shape_pt_sequence` tinyint(3) NOT NULL,
  `shape_dist_traveled` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`shape_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `stop_times`;
CREATE TABLE `stop_times` (
  `trip_id` mediumint(12) unsigned NOT NULL,
  `arrival_time` time DEFAULT NULL,
  `departure_time` time DEFAULT NULL,
  `stop_id` varchar(255) NOT NULL,
  `stop_sequence` tinyint(1) unsigned NOT NULL,
  `stop_headsign` varchar(50) DEFAULT NULL,
  `pickup_type` tinyint(1) unsigned DEFAULT NULL,
  `drop_off_type` tinyint(1) unsigned DEFAULT NULL,
  `shape_dist_traveled` varchar(50) DEFAULT NULL,
  `timepoint` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`trip_id`, `stop_sequence`),
  KEY `arrival_time` (`arrival_time`),
  KEY `departure_time` (`departure_time`),
  KEY `stop_id` (`stop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `stops`;
CREATE TABLE `stops` (
  `stop_id` varchar(255) NOT NULL,
  `stop_code` varchar(50) DEFAULT NULL,
  `stop_name` varchar(255) NOT NULL,
  `stop_desc` varchar(255) DEFAULT NULL,
  `stop_lat` double DEFAULT NULL,
  `stop_lon` double DEFAULT NULL,
  `zone_id` varchar(255) DEFAULT NULL,
  `stop_url` varchar(255) DEFAULT NULL,
  `location_type` varchar(2) DEFAULT NULL,
  `parent_station` varchar(100) DEFAULT NULL,
  `stop_timezone` varchar(50) DEFAULT NULL,
  `wheelchair_boarding` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`stop_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `transfers`;
CREATE TABLE `transfers` (
  `from_stop_id` varchar(255) NOT NULL,
  `to_stop_id` varchar(255) NOT NULL,
  `transfer_type` tinyint(1) unsigned NOT NULL,
  `min_transfer_time` smallint(8) unsigned NOT NULL,
  PRIMARY KEY (`from_stop_id`, `to_stop_id`, `transfer_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
  `route_id` varchar(255) NOT NULL,
  `service_id` smallint(12) unsigned NOT NULL,
  `trip_id` mediumint(12) unsigned NOT NULL,
  `trip_headsign` varchar(50) DEFAULT NULL,
  `trip_short_name` varchar(50) DEFAULT NULL,
  `direction_id` tinyint(1) unsigned DEFAULT NULL,
  `wheelchair_accessible` tinyint(1) unsigned DEFAULT NULL,
  `bikes_allowed` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`trip_id`),
  KEY `service_id` (`service_id`),
  KEY `trip` (`trip_headsign`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;