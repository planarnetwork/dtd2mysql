/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;
DROP TABLE IF EXISTS `additional_fixed_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `additional_fixed_link` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `mode` varchar(10) NOT NULL,
  `origin` char(3) NOT NULL,
  `destination` char(3) NOT NULL,
  `duration` smallint(3) unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `priority` tinyint(1) unsigned NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `alias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `alias` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `station_name` char(26) NOT NULL,
  `station_alias` char(26) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `alias_key` (`station_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `association`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `association` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `base_uid` char(6) NOT NULL,
  `assoc_uid` char(6) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `assoc_cat` char(2) DEFAULT NULL,
  `assoc_date_ind` char(1) DEFAULT NULL,
  `assoc_location` char(7) NOT NULL,
  `base_location_suffix` char(1) NOT NULL,
  `assoc_location_suffix` char(1) NOT NULL,
  `association_type` char(1) DEFAULT NULL,
  `stp_indicator` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `association_key` (`base_uid`,`assoc_uid`,`assoc_location`,`start_date`,`stp_indicator`),
  KEY `end_date` (`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fixed_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fixed_link` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `mode` varchar(10) NOT NULL,
  `origin` char(3) NOT NULL,
  `destination` char(3) NOT NULL,
  `duration` smallint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fixed_link_key` (`mode`,`origin`,`destination`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) DEFAULT NULL,
  `processed` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `physical_station`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `physical_station` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `station_name` char(26) NOT NULL,
  `cate_interchange_status` tinyint(1) unsigned DEFAULT NULL,
  `tiploc_code` char(7) NOT NULL,
  `crs_reference_code` char(3) DEFAULT NULL,
  `crs_code` char(3) DEFAULT NULL,
  `easting` mediumint(5) unsigned DEFAULT NULL,
  `northing` mediumint(5) unsigned DEFAULT NULL,
  `minimum_change_time` tinyint(2) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `physical_station_key` (`tiploc_code`),
  KEY `crs_code` (`crs_code`)
) ENGINE=InnoDB AUTO_INCREMENT=205 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `train_uid` char(6) NOT NULL,
  `runs_from` date NOT NULL,
  `runs_to` date NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `bank_holiday_running` tinyint(1) unsigned NOT NULL,
  `train_status` char(1) DEFAULT NULL,
  `train_category` char(2) DEFAULT NULL,
  `train_identity` char(4) DEFAULT NULL,
  `headcode` char(4) DEFAULT NULL,
  `course_indicator` char(1) NOT NULL,
  `profit_center` char(8) DEFAULT NULL,
  `business_sector` char(1) DEFAULT NULL,
  `power_type` char(3) DEFAULT NULL,
  `timing_load` char(4) DEFAULT NULL,
  `speed` char(3) DEFAULT NULL,
  `operating_chars` char(6) DEFAULT NULL,
  `train_class` char(1) DEFAULT NULL,
  `sleepers` char(1) DEFAULT NULL,
  `reservations` char(1) DEFAULT NULL,
  `connect_indicator` char(1) DEFAULT NULL,
  `catering_code` char(4) DEFAULT NULL,
  `service_branding` char(4) DEFAULT NULL,
  `stp_indicator` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `schedule_key` (`train_uid`,`runs_from`,`stp_indicator`),
  KEY `runs_from` (`runs_from`)
) ENGINE=InnoDB AUTO_INCREMENT=135 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `schedule_extra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedule_extra` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `schedule` int(11) unsigned NOT NULL,
  `traction_class` char(4) DEFAULT NULL,
  `uic_code` char(5) DEFAULT NULL,
  `atoc_code` char(2) NOT NULL,
  `applicable_timetable_code` char(1) NOT NULL,
  `retail_train_id` char(8) DEFAULT NULL,
  `source` char(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule` (`schedule`)
) ENGINE=InnoDB AUTO_INCREMENT=125 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_change`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_change` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `stop` int(11) unsigned NOT NULL,
  `location` char(7) NOT NULL,
  `suffix` tinyint(1) unsigned DEFAULT NULL,
  `train_category` char(2) DEFAULT NULL,
  `train_identity` char(4) DEFAULT NULL,
  `headcode` char(4) DEFAULT NULL,
  `course_indicator` char(1) NOT NULL,
  `profit_center` char(8) DEFAULT NULL,
  `business_sector` char(1) DEFAULT NULL,
  `power_type` char(3) DEFAULT NULL,
  `timing_load` char(4) DEFAULT NULL,
  `speed` char(3) DEFAULT NULL,
  `operating_chars` char(6) DEFAULT NULL,
  `train_class` char(1) DEFAULT NULL,
  `sleepers` char(1) DEFAULT NULL,
  `reservations` char(1) DEFAULT NULL,
  `connect_indicator` char(1) DEFAULT NULL,
  `catering_code` char(4) DEFAULT NULL,
  `service_branding` char(4) DEFAULT NULL,
  `traction_class` char(4) DEFAULT NULL,
  `uic_code` char(5) DEFAULT NULL,
  `retail_train_id` char(8) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `stop` (`stop`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `stop_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `stop_time` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `schedule` int(11) unsigned NOT NULL,
  `location` char(7) NOT NULL,
  `suffix` tinyint(1) unsigned DEFAULT NULL,
  `scheduled_arrival_time` time DEFAULT NULL,
  `scheduled_departure_time` time DEFAULT NULL,
  `scheduled_pass_time` time DEFAULT NULL,
  `public_arrival_time` time DEFAULT NULL,
  `public_departure_time` time DEFAULT NULL,
  `platform` char(3) DEFAULT NULL,
  `line` char(3) DEFAULT NULL,
  `path` char(3) DEFAULT NULL,
  `activity` varchar(12) NOT NULL,
  `engineering_allowance` char(2) DEFAULT NULL,
  `pathing_allowance` char(2) DEFAULT NULL,
  `performance_allowance` char(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `stop_time_key` (`schedule`,`location`,`suffix`,`public_departure_time`)
) ENGINE=InnoDB AUTO_INCREMENT=6600 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tiploc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiploc` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `tiploc_code` char(7) NOT NULL,
  `capitals` char(2) NOT NULL,
  `nalco` char(6) NOT NULL,
  `nlc_check_character` char(1) NOT NULL,
  `tps_description` char(26) DEFAULT NULL,
  `stanox` char(5) NOT NULL,
  `po_mcp_code` smallint(4) unsigned NOT NULL,
  `crs_code` char(3) DEFAULT NULL,
  `description` char(16) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tiploc_key` (`tiploc_code`),
  KEY `crs_code` (`crs_code`)
) ENGINE=InnoDB AUTO_INCREMENT=386 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `toc_interchange`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toc_interchange` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `crs` char(3) NOT NULL,
  `from_toc` char(2) NOT NULL,
  `to_toc` char(2) NOT NULL,
  `time` tinyint(2) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `toc_interchange_key` (`crs`,`from_toc`,`to_toc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `z_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `z_schedule` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `train_uid` char(6) NOT NULL,
  `runs_from` date NOT NULL,
  `runs_to` date NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `bank_holiday_running` tinyint(1) unsigned NOT NULL,
  `train_status` char(1) DEFAULT NULL,
  `train_category` char(2) DEFAULT NULL,
  `train_identity` char(4) DEFAULT NULL,
  `headcode` char(4) DEFAULT NULL,
  `course_indicator` char(1) DEFAULT NULL,
  `profit_center` char(8) DEFAULT NULL,
  `business_sector` char(1) DEFAULT NULL,
  `power_type` char(3) DEFAULT NULL,
  `timing_load` char(4) DEFAULT NULL,
  `speed` char(3) DEFAULT NULL,
  `operating_chars` char(6) DEFAULT NULL,
  `train_class` char(1) DEFAULT NULL,
  `sleepers` char(1) DEFAULT NULL,
  `reservations` char(1) DEFAULT NULL,
  `connect_indicator` char(1) DEFAULT NULL,
  `catering_code` char(4) DEFAULT NULL,
  `service_branding` char(4) DEFAULT NULL,
  `stp_indicator` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `z_schedule_key` (`train_uid`,`runs_from`,`stp_indicator`),
  KEY `runs_from` (`runs_from`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `z_schedule_extra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `z_schedule_extra` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `schedule` int(11) unsigned NOT NULL,
  `atoc_code` char(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `schedule` (`schedule`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `z_stop_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `z_stop_time` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `z_schedule` int(11) unsigned NOT NULL,
  `location` char(3) NOT NULL,
  `scheduled_arrival_time` time DEFAULT NULL,
  `scheduled_departure_time` time DEFAULT NULL,
  `scheduled_pass_time` time DEFAULT NULL,
  `public_arrival_time` time DEFAULT NULL,
  `public_departure_time` time DEFAULT NULL,
  `platform` char(3) DEFAULT NULL,
  `line` char(3) DEFAULT NULL,
  `path` char(3) DEFAULT NULL,
  `activity` varchar(12) NOT NULL,
  `engineering_allowance` char(2) DEFAULT NULL,
  `pathing_allowance` char(2) DEFAULT NULL,
  `performance_allowance` char(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `z_stop_time_key` (`z_schedule`,`location`,`public_departure_time`)
) ENGINE=InnoDB AUTO_INCREMENT=212 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

