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
) ENGINE=InnoDB AUTO_INCREMENT=12694 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `advance_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `advance_ticket` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_code` char(3) NOT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  `restriction_flag` char(1) NOT NULL,
  `toc_id` char(2) DEFAULT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `check_type` char(1) NOT NULL,
  `ap_data` char(8) NOT NULL,
  `booking_time` time DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `advance_ticket_key` (`ticket_code`,`restriction_code`,`restriction_flag`,`toc_id`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2743 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=895 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=5350 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `easement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `easement` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `easement_ref` char(6) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `text_ref` char(6) NOT NULL,
  `easement_type` tinyint(1) unsigned NOT NULL,
  `easement_class` tinyint(1) unsigned NOT NULL,
  `category` tinyint(1) unsigned NOT NULL,
  `monday` tinyint(1) unsigned DEFAULT NULL,
  `tuesday` tinyint(1) unsigned DEFAULT NULL,
  `wednesday` tinyint(1) unsigned DEFAULT NULL,
  `thursday` tinyint(1) unsigned DEFAULT NULL,
  `friday` tinyint(1) unsigned DEFAULT NULL,
  `saturday` tinyint(1) unsigned DEFAULT NULL,
  `sunday` tinyint(1) unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `easement_key` (`easement_ref`)
) ENGINE=InnoDB AUTO_INCREMENT=2527 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `easement_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `easement_detail` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `easement_ref` char(6) NOT NULL,
  `detail_type` tinyint(1) unsigned NOT NULL,
  `detail_code` varchar(8) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `easement_detail_key` (`easement_ref`,`detail_type`,`detail_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1691 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `easement_exception`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `easement_exception` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `easement_ref` char(6) NOT NULL,
  `exception_type` tinyint(1) unsigned NOT NULL,
  `exception_code` varchar(8) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `easement_exception_key` (`easement_ref`,`exception_type`,`exception_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `easement_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `easement_location` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `easement_ref` char(6) NOT NULL,
  `location_code` char(3) NOT NULL,
  `location_modifier` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17332 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `easement_text`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `easement_text` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `text_ref` char(6) NOT NULL,
  `easement_text` varchar(2000) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `easement_text_key` (`text_ref`)
) ENGINE=InnoDB AUTO_INCREMENT=957 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `easement_toc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `easement_toc` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `text_ref` char(6) NOT NULL,
  `toc` char(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `easement_toc_key` (`text_ref`,`toc`)
) ENGINE=InnoDB AUTO_INCREMENT=1001 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fare`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `fare` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `flow_id` mediumint(7) unsigned NOT NULL,
  `ticket_code` char(3) NOT NULL,
  `fare` int(8) unsigned NOT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fare_key` (`flow_id`,`ticket_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7343599 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=3673 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `flow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `flow` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `origin_code` char(4) NOT NULL,
  `destination_code` char(4) NOT NULL,
  `route_code` char(5) NOT NULL,
  `status_code` char(3) NOT NULL,
  `usage_code` char(1) NOT NULL,
  `direction` char(1) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `toc` char(3) NOT NULL,
  `cross_london_ind` tinyint(1) unsigned NOT NULL,
  `ns_disc_ind` tinyint(1) unsigned NOT NULL,
  `publication_ind` char(1) NOT NULL,
  `flow_id` mediumint(7) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `flow_key` (`origin_code`,`destination_code`,`route_code`,`status_code`,`usage_code`,`direction`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=698119 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `link` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `start_node` char(3) NOT NULL,
  `end_node` char(3) NOT NULL,
  `map_code` char(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `link_key` (`start_node`,`end_node`,`map_code`)
) ENGINE=InnoDB AUTO_INCREMENT=18461 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `location` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uic_code` char(3) NOT NULL,
  `nlc_code` char(4) NOT NULL,
  `group_code` char(4) NOT NULL,
  `crs_code` char(3) DEFAULT NULL,
  `county_code` char(2) NOT NULL,
  `zone_code` char(4) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_key` (`uic_code`,`nlc_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4966 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `location_association`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_association` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uic_code` char(7) NOT NULL,
  `end_date` date NOT NULL,
  `assoc_uic_code` char(7) NOT NULL,
  `assoc_crs_code` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_association_key` (`uic_code`,`end_date`,`assoc_uic_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `location_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_group` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `group_uic_code` char(7) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `description` char(16) NOT NULL,
  `ers_country` char(2) DEFAULT NULL,
  `ers_code` char(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_group_key` (`group_uic_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=818 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `location_group_member`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_group_member` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `group_uic_code` char(7) NOT NULL,
  `end_date` date NOT NULL,
  `member_uic_code` char(7) NOT NULL,
  `member_crs_code` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_group_member_key` (`group_uic_code`,`end_date`,`member_uic_code`),
  KEY `member_uic_code` (`member_uic_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1385 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `location_railcard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_railcard` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uic_code` char(7) NOT NULL,
  `railcard_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_railcard_key` (`uic_code`,`railcard_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=171659 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `location_synonym`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `location_synonym` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `uic_code` char(7) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `description` char(16) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `location_synonym_key` (`uic_code`,`end_date`,`start_date`,`description`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `log` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) DEFAULT NULL,
  `processed` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `london_route`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `london_route` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `route_code` char(5) NOT NULL,
  `london_marker` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `london_route_key` (`route_code`)
) ENGINE=InnoDB AUTO_INCREMENT=917 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `london_station`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `london_station` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `crs_code` char(3) NOT NULL,
  `lt_marker` tinyint(1) unsigned NOT NULL,
  `xlondon_marker` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `london_station_key` (`crs_code`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `map`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `map` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `map_identifier` char(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `map_key` (`map_identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=352 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `new_station`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `new_station` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `nfm64_station_code` char(3) NOT NULL,
  `new_station_code` char(3) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `new_station_key` (`nfm64_station_code`,`new_station_code`)
) ENGINE=InnoDB AUTO_INCREMENT=159 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `nfm64`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `nfm64` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `origin` char(4) NOT NULL,
  `destination` char(4) NOT NULL,
  `route_code` char(5) NOT NULL,
  `ticket_code` char(3) NOT NULL,
  `price` mediumint(6) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nfm64_key` (`origin`,`destination`,`route_code`,`ticket_code`)
) ENGINE=InnoDB AUTO_INCREMENT=10148372 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `non_derivable_fare`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `non_derivable_fare` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `origin_code` char(4) NOT NULL,
  `destination_code` char(4) NOT NULL,
  `route_code` char(5) DEFAULT NULL,
  `railcard_code` char(3) NOT NULL,
  `ticket_code` char(3) NOT NULL,
  `nd_record_type` char(1) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `suppress_mkr` tinyint(1) unsigned NOT NULL,
  `adult_fare` int(8) unsigned DEFAULT NULL,
  `child_fare` int(8) unsigned DEFAULT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  `composite_indicator` char(1) NOT NULL,
  `cross_london_ind` tinyint(1) unsigned NOT NULL,
  `ps_ind` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `non_derivable_fare_key` (`origin_code`,`destination_code`,`route_code`,`railcard_code`,`ticket_code`,`nd_record_type`,`end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `non_derivable_fare_override`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `non_derivable_fare_override` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `origin_code` char(4) NOT NULL,
  `destination_code` char(4) NOT NULL,
  `route_code` char(5) DEFAULT NULL,
  `railcard_code` char(3) NOT NULL,
  `ticket_code` char(3) NOT NULL,
  `nd_record_type` char(1) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `suppress_mkr` tinyint(1) unsigned NOT NULL,
  `adult_fare` int(8) unsigned DEFAULT NULL,
  `child_fare` int(8) unsigned DEFAULT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  `composite_indicator` char(1) DEFAULT NULL,
  `cross_london_ind` tinyint(1) unsigned DEFAULT NULL,
  `ps_ind` char(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `non_derivable_fare_override_key` (`origin_code`,`destination_code`,`route_code`,`railcard_code`,`ticket_code`,`nd_record_type`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=249922 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `non_standard_discount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `non_standard_discount` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `origin_code` char(4) DEFAULT NULL,
  `destination_code` char(4) DEFAULT NULL,
  `route_code` char(5) DEFAULT NULL,
  `railcard_code` char(3) DEFAULT NULL,
  `ticket_code` char(3) DEFAULT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `use_nlc` char(4) DEFAULT NULL,
  `adult_nodis_flag` char(1) NOT NULL,
  `adult_add_on_amount` int(8) unsigned DEFAULT NULL,
  `adult_rebook_flag` char(1) NOT NULL,
  `child_nodis_flag` char(1) NOT NULL,
  `child_add_on_amount` int(8) unsigned DEFAULT NULL,
  `child_rebook_flag` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `non_standard_discount_key` (`origin_code`,`destination_code`,`route_code`,`railcard_code`,`ticket_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=326107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `package`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `package_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  `origin_facilities` char(26) DEFAULT NULL,
  `destination_facilities` char(26) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_key` (`package_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `package_supplement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_supplement` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `package_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `supplement_code` char(3) NOT NULL,
  `direction` char(1) NOT NULL,
  `pack_number` char(3) NOT NULL,
  `origin_facility` char(1) DEFAULT NULL,
  `dest_facility` char(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `package_supplement_key` (`package_code`,`end_date`,`supplement_code`)
) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permitted_route`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `permitted_route` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `start_routeing_point` char(3) NOT NULL,
  `end_routeing_point` char(3) NOT NULL,
  `map_code` varchar(150) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=246317 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=9893 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `railcard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `railcard` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `railcard_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `holder_type` char(1) NOT NULL,
  `description` char(20) NOT NULL,
  `restricted_by_issue` tinyint(1) unsigned NOT NULL,
  `restricted_by_area` tinyint(1) unsigned NOT NULL,
  `restricted_by_train` tinyint(1) unsigned NOT NULL,
  `restricted_by_date` tinyint(1) unsigned NOT NULL,
  `master_code` char(3) DEFAULT NULL,
  `display_flag` char(1) NOT NULL,
  `max_passengers` smallint(3) unsigned NOT NULL,
  `min_passengers` smallint(3) unsigned NOT NULL,
  `max_holders` smallint(3) unsigned NOT NULL,
  `min_holders` smallint(3) unsigned NOT NULL,
  `max_acc_adults` smallint(3) unsigned NOT NULL,
  `min_acc_adults` smallint(3) unsigned NOT NULL,
  `max_adults` smallint(3) unsigned NOT NULL,
  `min_adults` smallint(3) unsigned NOT NULL,
  `max_children` smallint(3) unsigned NOT NULL,
  `min_children` smallint(3) unsigned NOT NULL,
  `price` int(8) unsigned DEFAULT NULL,
  `discount_price` int(8) unsigned DEFAULT NULL,
  `validity_period` char(4) DEFAULT NULL,
  `last_valid_date` date DEFAULT NULL,
  `physical_card` tinyint(1) unsigned NOT NULL,
  `capri_ticket_type` char(3) DEFAULT NULL,
  `adult_status` char(3) DEFAULT NULL,
  `child_status` char(3) DEFAULT NULL,
  `aaa_status` char(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `railcard_key` (`railcard_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=1519 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `railcard_minimum_fare`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `railcard_minimum_fare` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `railcard_code` char(3) NOT NULL,
  `ticket_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `minimum_fare` int(8) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `railcard_minimum_fare_key` (`railcard_code`,`ticket_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=10745 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_date`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_date` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `atb_desc` char(5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_date_key` (`cf_mkr`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_exception`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_exception` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `exception_code` char(1) NOT NULL,
  `description` char(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_exception_key` (`cf_mkr`,`exception_code`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_header`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_header` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `description` char(30) DEFAULT NULL,
  `desc_out` char(50) DEFAULT NULL,
  `desc_ret` char(50) DEFAULT NULL,
  `type_out` char(1) NOT NULL,
  `type_ret` char(1) NOT NULL,
  `change_ind` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_header_key` (`cf_mkr`,`restriction_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1683 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_header_date`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_header_date` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `date_from` char(4) NOT NULL,
  `date_to` char(4) NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_header_date_key` (`cf_mkr`,`restriction_code`,`date_from`,`date_to`)
) ENGINE=InnoDB AUTO_INCREMENT=6951 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_railcard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_railcard` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `railcard_code` char(3) NOT NULL,
  `sequence_no` char(4) NOT NULL,
  `ticket_code` char(3) DEFAULT NULL,
  `route_code` char(5) DEFAULT NULL,
  `location` char(3) DEFAULT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  `total_ban` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_railcard_key` (`cf_mkr`,`railcard_code`,`sequence_no`)
) ENGINE=InnoDB AUTO_INCREMENT=326725 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_ticket_calendar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_ticket_calendar` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `ticket_code` char(3) NOT NULL,
  `cal_type` char(1) NOT NULL,
  `route_code` char(5) DEFAULT NULL,
  `country_code` char(1) NOT NULL,
  `date_from` char(4) NOT NULL,
  `date_to` char(4) NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_ticket_calendar_key` (`cf_mkr`,`ticket_code`,`cal_type`,`route_code`,`country_code`,`date_from`,`date_to`)
) ENGINE=InnoDB AUTO_INCREMENT=1281 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_time`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_time` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `sequence_no` char(4) NOT NULL,
  `out_ret` char(1) NOT NULL,
  `time_from` time NOT NULL,
  `time_to` time NOT NULL,
  `arr_dep_via` char(1) NOT NULL,
  `location` char(3) DEFAULT NULL,
  `rstr_type` char(1) NOT NULL,
  `train_type` char(1) NOT NULL,
  `min_fare_flag` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_time_key` (`cf_mkr`,`restriction_code`,`sequence_no`,`out_ret`)
) ENGINE=InnoDB AUTO_INCREMENT=66363 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_time_date`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_time_date` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `sequence_no` char(4) NOT NULL,
  `out_ret` char(1) NOT NULL,
  `date_from` char(4) NOT NULL,
  `date_to` char(4) NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_time_date_key` (`cf_mkr`,`restriction_code`,`sequence_no`,`out_ret`,`date_from`,`date_to`)
) ENGINE=InnoDB AUTO_INCREMENT=32773 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_time_toc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_time_toc` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `sequence_no` char(4) NOT NULL,
  `out_ret` char(1) NOT NULL,
  `toc_code` char(2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_time_toc_key` (`cf_mkr`,`restriction_code`,`sequence_no`,`out_ret`,`toc_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8719 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_train`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_train` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `train_no` char(6) NOT NULL,
  `out_ret` char(1) NOT NULL,
  `quota_ind` char(1) NOT NULL,
  `sleeper_ind` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_train_key` (`cf_mkr`,`restriction_code`,`train_no`,`out_ret`)
) ENGINE=InnoDB AUTO_INCREMENT=15429 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_train_date`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_train_date` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `train_no` char(6) NOT NULL,
  `out_ret` char(1) NOT NULL,
  `date_from` char(4) NOT NULL,
  `date_to` char(4) NOT NULL,
  `monday` tinyint(1) unsigned NOT NULL,
  `tuesday` tinyint(1) unsigned NOT NULL,
  `wednesday` tinyint(1) unsigned NOT NULL,
  `thursday` tinyint(1) unsigned NOT NULL,
  `friday` tinyint(1) unsigned NOT NULL,
  `saturday` tinyint(1) unsigned NOT NULL,
  `sunday` tinyint(1) unsigned NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_train_date_key` (`cf_mkr`,`restriction_code`,`train_no`,`out_ret`,`date_from`,`date_to`)
) ENGINE=InnoDB AUTO_INCREMENT=951 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `restriction_train_quota`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restriction_train_quota` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cf_mkr` char(1) NOT NULL,
  `restriction_code` char(2) NOT NULL,
  `train_no` char(6) NOT NULL,
  `out_ret` char(1) NOT NULL,
  `location` char(3) NOT NULL,
  `quota_ind` char(1) DEFAULT NULL,
  `arr_dep` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `restriction_train_quota_key` (`cf_mkr`,`restriction_code`,`train_no`,`out_ret`,`location`,`quota_ind`,`arr_dep`)
) ENGINE=InnoDB AUTO_INCREMENT=8703 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `route`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `route` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `route_code` char(5) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `description` char(16) NOT NULL,
  `atb_desc_1` char(35) DEFAULT NULL,
  `atb_desc_2` char(35) DEFAULT NULL,
  `atb_desc_3` char(35) DEFAULT NULL,
  `atb_desc_4` char(35) DEFAULT NULL,
  `cc_desc` char(16) NOT NULL,
  `aaa_desc` char(41) DEFAULT NULL,
  `uts_mode` char(1) NOT NULL,
  `uts_zone_1` tinyint(1) unsigned NOT NULL,
  `uts_zone_2` tinyint(1) unsigned NOT NULL,
  `uts_zone_3` tinyint(1) unsigned NOT NULL,
  `uts_zone_4` tinyint(1) unsigned NOT NULL,
  `uts_zone_5` tinyint(1) unsigned NOT NULL,
  `uts_zone_6` tinyint(1) unsigned NOT NULL,
  `uts_north` char(3) NOT NULL,
  `uts_east` char(3) NOT NULL,
  `uts_south` char(3) NOT NULL,
  `uts_west` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_key` (`route_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=1483 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `route_data`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `route_data` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `route_code` char(5) NOT NULL,
  `entry_type` char(1) NOT NULL,
  `crs_code` char(3) DEFAULT NULL,
  `group_mkr` tinyint(1) unsigned NOT NULL,
  `mode_code` char(3) DEFAULT NULL,
  `toc_id` char(2) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9981 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `route_location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `route_location` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `route_code` char(5) NOT NULL,
  `end_date` date NOT NULL,
  `admin_area_code` char(3) NOT NULL,
  `nlc_code` char(4) NOT NULL,
  `crs_code` char(3) DEFAULT NULL,
  `incl_excl` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `route_location_key` (`route_code`,`end_date`,`admin_area_code`,`nlc_code`)
) ENGINE=InnoDB AUTO_INCREMENT=1318 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `routeing_node`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `routeing_node` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `node` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `routeing_node_key` (`node`)
) ENGINE=InnoDB AUTO_INCREMENT=357 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `routeing_point`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `routeing_point` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `routeing_point` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `routeing_point_key` (`routeing_point`)
) ENGINE=InnoDB AUTO_INCREMENT=273 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rover`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rover` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rover_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `description` char(30) NOT NULL,
  `ticket_desc` char(15) NOT NULL,
  `capri_ticket_code` char(3) DEFAULT NULL,
  `rover_accounting_code` char(4) NOT NULL,
  `days_travel` smallint(3) unsigned NOT NULL,
  `months_valid` tinyint(2) unsigned NOT NULL,
  `days_valid` tinyint(2) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rover_key` (`rover_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2377 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rover_price`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rover_price` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rover_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `railcard_code` char(3) NOT NULL,
  `rover_class` tinyint(1) unsigned NOT NULL,
  `adult_fare` int(8) unsigned DEFAULT NULL,
  `child_fare` int(8) unsigned DEFAULT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rover_price_key` (`rover_code`,`end_date`,`railcard_code`,`rover_class`)
) ENGINE=InnoDB AUTO_INCREMENT=16438 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=430746 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=384039 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=87629 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `station_cluster`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `station_cluster` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `cluster_id` char(4) NOT NULL,
  `cluster_nlc` char(4) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `station_cluster_key` (`cluster_id`,`cluster_nlc`,`end_date`),
  KEY `cluster_nlc` (`cluster_nlc`)
) ENGINE=InnoDB AUTO_INCREMENT=43714 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `station_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `station_group` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `station_group_id` char(3) NOT NULL,
  `main_station` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `station_group_key` (`station_group_id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `station_link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `station_link` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `start_station` char(3) NOT NULL,
  `end_station` char(3) NOT NULL,
  `distance` double(7,4) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `station_link_key` (`start_station`,`end_station`)
) ENGINE=InnoDB AUTO_INCREMENT=5867 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `station_routeing_point`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `station_routeing_point` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `station_identifier` char(3) NOT NULL,
  `routeing_point_1` char(3) DEFAULT NULL,
  `routeing_point_2` char(3) DEFAULT NULL,
  `routeing_point_3` char(3) DEFAULT NULL,
  `routeing_point_4` char(3) DEFAULT NULL,
  `station_group_id` char(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `station_routeing_point_key` (`station_identifier`)
) ENGINE=InnoDB AUTO_INCREMENT=2609 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `status` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `status_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `atb_desc` char(5) DEFAULT NULL,
  `cc_desc` char(5) DEFAULT NULL,
  `uts_code` char(1) NOT NULL,
  `first_single_max_flat` int(8) unsigned DEFAULT NULL,
  `first_return_max_flat` int(8) unsigned DEFAULT NULL,
  `std_single_max_flat` int(8) unsigned DEFAULT NULL,
  `std_return_max_flat` int(8) unsigned DEFAULT NULL,
  `first_lower_min` int(8) unsigned DEFAULT NULL,
  `first_higher_min` int(8) unsigned DEFAULT NULL,
  `std_lower_min` int(8) unsigned DEFAULT NULL,
  `std_higher_min` int(8) unsigned DEFAULT NULL,
  `fs_mkr` tinyint(1) unsigned NOT NULL,
  `fr_mkr` tinyint(1) unsigned NOT NULL,
  `ss_mkr` tinyint(1) unsigned NOT NULL,
  `sr_mkr` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_key` (`status_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=1154 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `status_discount`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `status_discount` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `status_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `discount_category` tinyint(2) unsigned NOT NULL,
  `discount_indicator` char(1) NOT NULL,
  `discount_percentage` smallint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_discount_key` (`status_code`,`end_date`,`discount_category`)
) ENGINE=InnoDB AUTO_INCREMENT=23061 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=7097423 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supplement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplement` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `supplement_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `description` char(20) NOT NULL,
  `short_desc` char(12) NOT NULL,
  `suppl_type` char(3) NOT NULL,
  `price` mediumint(5) unsigned NOT NULL,
  `cpf_ticket_type` char(5) DEFAULT NULL,
  `min_group_size` tinyint(1) unsigned NOT NULL,
  `max_group_size` tinyint(1) unsigned NOT NULL,
  `per_leg_or_dir` char(1) NOT NULL,
  `class_type` char(1) NOT NULL,
  `capri_code` char(3) DEFAULT NULL,
  `sep_tkt_ind` char(1) NOT NULL,
  `resvn_type` char(2) NOT NULL,
  `sundry_code` char(5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplement_key` (`supplement_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=260 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supplement_override`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplement_override` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `supplement_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `overridden_supplement` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplement_override_key` (`supplement_code`,`end_date`,`overridden_supplement`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supplement_rule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplement_rule` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rule_number` smallint(3) unsigned NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `train_uid` char(7) DEFAULT NULL,
  `train_uid_desc` char(39) DEFAULT NULL,
  `fare_class` char(1) NOT NULL,
  `quota` char(1) NOT NULL,
  `weekend_first` char(1) NOT NULL,
  `silver_standard` char(1) NOT NULL,
  `railcard` char(1) NOT NULL,
  `catering_code` char(1) NOT NULL,
  `sleeper` char(1) NOT NULL,
  `accom_class` char(1) NOT NULL,
  `status` char(1) NOT NULL,
  `reservation_status` char(3) DEFAULT NULL,
  `sectors` char(3) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplement_rule_key` (`rule_number`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=777 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supplement_rule_applies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplement_rule_applies` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rule_number` smallint(3) unsigned NOT NULL,
  `end_date` date NOT NULL,
  `ie_marker` char(1) NOT NULL,
  `condition_type` char(1) NOT NULL,
  `ie_code` char(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplement_rule_applies_key` (`rule_number`,`end_date`,`ie_marker`,`condition_type`,`ie_code`)
) ENGINE=InnoDB AUTO_INCREMENT=3133 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supplement_rule_supplement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplement_rule_supplement` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `rule_number` smallint(3) unsigned NOT NULL,
  `end_date` date NOT NULL,
  `supplement_code` char(3) NOT NULL,
  `om_flag` char(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `supplement_rule_supplement_key` (`rule_number`,`end_date`,`supplement_code`)
) ENGINE=InnoDB AUTO_INCREMENT=962 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_type`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_type` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_code` char(3) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `quote_date` date NOT NULL,
  `description` char(15) NOT NULL,
  `tkt_class` tinyint(1) unsigned NOT NULL,
  `tkt_type` char(1) NOT NULL,
  `tkt_group` char(1) NOT NULL,
  `last_valid_day` date NOT NULL,
  `max_passengers` smallint(3) unsigned NOT NULL,
  `min_passengers` smallint(3) unsigned NOT NULL,
  `max_adults` smallint(3) unsigned NOT NULL,
  `min_adults` smallint(3) unsigned NOT NULL,
  `max_children` smallint(3) unsigned NOT NULL,
  `min_children` smallint(3) unsigned NOT NULL,
  `restricted_by_date` tinyint(1) unsigned NOT NULL,
  `restricted_by_train` tinyint(1) unsigned NOT NULL,
  `restricted_by_area` tinyint(1) unsigned NOT NULL,
  `validity_code` char(2) NOT NULL,
  `atb_description` char(20) NOT NULL,
  `lul_xlondon_issue` tinyint(1) unsigned NOT NULL,
  `reservation_required` char(1) NOT NULL,
  `capri_code` char(3) NOT NULL,
  `lul_93` tinyint(1) unsigned DEFAULT NULL,
  `uts_code` char(2) NOT NULL,
  `time_restriction` tinyint(1) unsigned DEFAULT NULL,
  `free_pass_lul` tinyint(1) unsigned DEFAULT NULL,
  `package_mkr` char(1) NOT NULL,
  `fare_multiplier` smallint(3) unsigned NOT NULL,
  `discount_category` tinyint(2) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_type_key` (`ticket_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=4140 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ticket_validity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_validity` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `validity_code` char(2) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `description` char(20) NOT NULL,
  `out_days` tinyint(2) unsigned NOT NULL,
  `out_months` tinyint(2) unsigned NOT NULL,
  `ret_days` tinyint(2) unsigned NOT NULL,
  `ret_months` tinyint(2) unsigned NOT NULL,
  `ret_after_days` tinyint(2) unsigned NOT NULL,
  `ret_after_months` tinyint(2) unsigned NOT NULL,
  `ret_after_day` char(2) DEFAULT NULL,
  `break_out` tinyint(1) unsigned NOT NULL,
  `break_in` tinyint(1) unsigned NOT NULL,
  `out_description` char(14) NOT NULL,
  `rtn_description` char(14) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ticket_validity_key` (`validity_code`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=311 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=12048 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `toc`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toc` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `toc_id` char(2) NOT NULL,
  `toc_name` char(30) NOT NULL,
  `active` tinyint(1) unsigned NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `toc_key` (`toc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=259 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `toc_fare`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toc_fare` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `fare_toc_id` char(3) NOT NULL,
  `toc_id` char(2) DEFAULT NULL,
  `fare_toc_name` char(30) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `toc_fare_key` (`fare_toc_id`,`toc_id`)
) ENGINE=InnoDB AUTO_INCREMENT=190 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `toc_specific_ticket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `toc_specific_ticket` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `ticket_code` char(3) NOT NULL,
  `restriction_code` char(2) DEFAULT NULL,
  `restriction_flag` char(1) NOT NULL,
  `direction` char(1) NOT NULL,
  `toc_id` char(2) DEFAULT NULL,
  `toc_type` char(1) NOT NULL,
  `end_date` date NOT NULL,
  `start_date` date NOT NULL,
  `sleeper_mkr` tinyint(1) unsigned NOT NULL,
  `inc_exc_stock` char(1) NOT NULL,
  `stock_list` char(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `toc_specific_ticket_key` (`ticket_code`,`restriction_code`,`restriction_flag`,`direction`,`toc_id`,`toc_type`,`end_date`)
) ENGINE=InnoDB AUTO_INCREMENT=23401 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=5384 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=16150 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=20932 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

