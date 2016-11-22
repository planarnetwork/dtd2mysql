"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const moment = require("moment");
const ACCEPTED_RAILCARDS = "'','YNG','DIS','DIC','FAM','HMF','NGC','NEW','SRN','2TR','GS3','JCP'";
const TICKET_CODE_WHITELIST = "'10A','10B','10F','10S','1AB','1AE','1AF','1AG','1AS','1BB','1BE','1BF'," +
    "'1BS','1CB','1CF','1CS','1DF','1DR','1DS','1DT','1EF','1ES','1FF','1FS','1GF','1GS','1HF','1HS','1SO'," +
    "'1SS','1ST','2AA','2AF','2AS','2BA','2BF','2BS','2CA','2CC','2CF','2CS','2DA','2DC','2DF','2DS','2EA'," +
    "'2EC','2EF','2ES','2FA','2FB','2FC','2FF','2FS','2GB','2GC','2GF','2GS','2HC','2HF','2HS','2IB','2IC'," +
    "'2ID','2IE','2IF','2IG','2IH','2II','2IJ','2IS','2JC','2JS','AA1','AB1','AD1','ADT','AE1','AF1','AG1'," +
    "'AG2','AH1','AH2','AI1','AI2','AJ2','AK2','AL2','AM3','AN2','AO2','AW1','AXS','BAO','BBO','BCO','BCR'," +
    "'BCS','BFO','BFR','BGO','BHO','BOP','BOS','BPS','BRS','BSS','BTS','BUS','BVR','BVS','BXS','BXZ','BYS'," +
    "'BZS','C1R','C1S','C2S','C3S','C4S','C7S','CA1','CA2','CAA','CAB','CAC','CAF','CAG','CAS','CAV','CBA'," +
    "'CBB','CCB','CDR','CDS','CNF','CNP','CNT','CO5','COP','CP5','DAS','DBS','DCS','DDS','DES','DFS','DG1'," +
    "'DG2','DG3','DGS','DHS','DKS','DLS','DRG','DRI','ECD','EGF','ETR','ETS','ETT','F0R','F1A','F1V','F2A'," +
    "'F2V','F3A','F3V','F4A','F4V','F5A','F7V','FAS','FBP','FBS','FCD','FCR','FCS','FDR','FDS','FDT','FFQ'," +
    "'FFX','FIS','FLX','FNW','FOR','FOS','FP1','FP2','FPB','FPP','FRX','FSO','FSR','FSS','FSX','FTV','FTX'," +
    "'FVS','FXR','FXS','G1R','G1S','G2R','G2S','GC3','GC4','GC5','GC6','GC7','GC8','GCA','GCB','GCD','GCE'," +
    "'GCG','GCH','GCJ','GCQ','GCR','GCS','GCT','GCU','GCV','GDR','GDS','GE1','GFR','GFS','GOR','GPR','GTR'," +
    "'GTS','GUR','GUS','GVR','GWC','GWD','HT1','HT2','HT4','HTA','HTS','HTT','L1R','L2R','LA1','LA2','LFB'," +
    "'LMM','MAF','MAS','MBF','MBS','MCF','MCS','MDF','MDS','MEF','MES','MFF','MFS','MGF','MGS','MHS','MMC'," +
    "'MMD','MME','NBA','NCA','NDA','NEA','OAS','OBS','OBZ','OCS','OCT','ODS','ODT','OES','OF1','OF2','OF3'," +
    "'OF4','OF5','OF6','OGS','OHS','OJS','OPD','OPF','OPR','OPS','OS1','OS2','OS3','OS4','OS5','OS6','OSA'," +
    "'OSB','OTF','PBD','PDR','PDS','S1A','S2A','S3A','S4A','S5A','SAS','SAV','SBP','SBV','SCO','SCV','SDR'," +
    "'SDS','SFR','SFX','SOA','SOB','SOF','SOP','SOR','SOS','SPG','SRF','SRR','SSH','SSR','SSS','STO','STP'," +
    "'SVR','SVS','SWS','TTR','TTS','UFA','UFB','UFC','UFD','UFE','UFF','UFG','USA','USB','USC','USD','USE'," +
    "'USF','USG','VA1','VA2','VAS','VBR','VBS','VCS','VDS','VES','WAS','WBS','WCS','WDS','WDT','WES','WFS'," +
    "'WGS','WHS','WJS','WK1','WK2','WKC','WKR','WKS','WLS','WMC','WMT','WRE','XBR','XC1','XC2','XD1','XG1'," +
    "'XG2','XM1','XM2','XP1','XP2','XQ1','XQ2','XS1','XS2','XS5','XS6','XS8','7DF','7DS','7DS','7DF','PSS'," +
    "'PSF','7TS','7TF','TRV','TRF','PB7','BMS','BQS','BAS','FTC','1DT','1JS','2KC','2LC','2MC','C1X','C2X'," +
    "'C3X','C4X','C5X','C3Y','C4Y','C5Y','C6Z','C7Z','C8Z','FAV','FBV','MIA','MIB','MIF','MIS','MJF','MJS'," +
    "'MMS','SDV','UFH','UFI','USH','USI','AM1','AM2','BFS','EGS','OLD','SOT','WTC'";
const RESTRICTION_DATE_TABLES = ["restriction_time_date", "restriction_ticket_calendar", "restriction_train_date", "restriction_header_date"];
class CleanFaresData {
    constructor(container) {
        this.db = container.get("database");
    }
    run(argv) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = CleanFaresData.QUERIES.map(q => this.queryWithRetry(q));
            promises.push(this.updateRestrictionDates());
            yield Promise.all(promises);
        });
    }
    queryWithRetry(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db.query(query).catch(err => {
                this.db.query(query); // retry
            });
        });
    }
    updateRestrictionDates() {
        return __awaiter(this, void 0, void 0, function* () {
            const [current, future] = yield this.db.query("SELECT * FROM restriction_date ORDER BY cf_mkr");
            const promises = RESTRICTION_DATE_TABLES.map(tableName => this.updateRestrictionDatesOnTable(tableName, current, future));
            return Promise.all([].concat.apply([], promises)); // flatten
        });
    }
    getStartDate(earliestDate, restrictionMonth) {
        const earliestMonth = moment(earliestDate).format("MMDD");
        const yearOffset = (parseInt(earliestMonth) > parseInt(restrictionMonth)) ? 1 : 0;
        return moment((earliestDate.getFullYear() + yearOffset) + restrictionMonth, "YYYYMMDD");
    }
    getEndDate(latestDate, restrictionMonth) {
        const latestMonth = moment(latestDate).format("MMDD");
        const yearOffset = (parseInt(latestMonth) >= parseInt(restrictionMonth)) ? 0 : -1;
        return moment((latestDate.getFullYear() + yearOffset) + restrictionMonth, "YYYYMMDD");
    }
    updateRestrictionDatesOnTable(tableName, current, future) {
        return this.db.query(`SELECT * FROM ${tableName}`).map(record => {
            const date = record.cf_mkr === 'C' ? current : future;
            const startDate = this.getStartDate(date.start_date, record.date_from);
            const endDate = this.getEndDate(date.end_date, record.date_to);
            if (startDate.isAfter(endDate)) {
                return this.db.query(`DELETE FROM ${tableName} WHERE id = ?`, [record.id]);
            }
            else {
                return this.db.query(`UPDATE ${tableName} SET start_date = ?, end_date = ? WHERE id = ?`, [
                    startDate.format("YYYY-MM-DD"),
                    endDate.format('YYYY-MM-DD'),
                    record.id
                ]);
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CleanFaresData;
CleanFaresData.QUERIES = [
    `DELETE FROM fare WHERE fare < 50 OR ticket_code NOT IN (${TICKET_CODE_WHITELIST})`,
    `DELETE FROM ticket_type WHERE ticket_code NOT IN (${TICKET_CODE_WHITELIST})`,
    "DELETE FROM flow WHERE usage_code = 'G'",
    "DELETE FROM flow WHERE flow_id NOT IN (SELECT flow_id FROM fare)",
    "DELETE FROM location WHERE end_date < CURDATE()",
    "DELETE FROM status_discount WHERE end_date < CURDATE()",
    "DELETE FROM status WHERE end_date < CURDATE()",
    `DELETE FROM non_derivable_fare WHERE end_date < CURDATE() OR composite_indicator != 'Y' OR adult_fare < 50 OR child_fare < 50 OR (ticket_code IS NOT NULL AND ticket_code NOT IN (${TICKET_CODE_WHITELIST}))`,
    "UPDATE non_derivable_fare SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare > 999999",
    "UPDATE non_derivable_fare SET child_fare = null WHERE child_fare = 99999 OR child_fare > 999999",
    `DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE() OR composite_indicator != 'Y' OR adult_fare < 50 OR child_fare < 50 OR (ticket_code IS NOT NULL AND ticket_code NOT IN (${TICKET_CODE_WHITELIST}))`,
    "UPDATE non_derivable_fare_override SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare > 999999",
    "UPDATE non_derivable_fare_override SET child_fare = null WHERE child_fare = 99999 OR child_fare > 999999",
    `DELETE FROM non_standard_discount WHERE end_date < CURDATE()  OR ticket_code NOT IN (${TICKET_CODE_WHITELIST})`,
    `DELETE FROM railcard WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS})`,
    `DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS}) OR ticket_code NOT IN (${TICKET_CODE_WHITELIST})`,
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='YNG'",
    "UPDATE railcard SET min_adults=1, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='DIS'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=1, max_children=1, max_passengers=2 WHERE railcard_code='DIC'",
    "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='FAM'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='HMF'",
    "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NGC'",
    "UPDATE railcard SET min_adults=1, max_adults=4, min_children=0, max_children=4, max_passengers=8 WHERE railcard_code='NEW'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='SRN'",
    "UPDATE railcard SET min_adults=2, max_adults=2, min_children=0, max_children=0, max_passengers=2 WHERE railcard_code='2TR'",
    "UPDATE railcard SET min_adults=3, max_adults=9, min_children=0, max_children=0, max_passengers=9 WHERE railcard_code='GS3'",
    "UPDATE railcard SET min_adults=1, max_adults=1, min_children=0, max_children=0, max_passengers=1 WHERE railcard_code='JCP'",
    "UPDATE railcard SET min_adults=0, max_adults=9, min_children=0, max_children=9, max_passengers=9 WHERE railcard_code=''",
    "UPDATE railcard SET child_status = '001' WHERE child_status='XXX'",
    "UPDATE status_discount SET discount_indicator = 'X' WHERE status_code != '000' and status_code != '001' AND discount_percentage = 0",
];
