
import {CLICommand} from "./CLICommand";
import {DatabaseConnection} from "../database/DatabaseConnection";
import moment = require("moment");
import {Moment} from "moment";

const ACCEPTED_RAILCARDS = "'','YNG','DIS','DIC','FAM','HMF','NGC','NEW','SRN','2TR','GS3','JCP'";
const TICKET_CODE_BLACKLIST = `"0AA","0AB","0AC","0AD","0AE","0AF","0AG","0AH","0AJ","0AK","0AL","0AM","0AN","0AQ","0AR",
"0AS","0AT","0AU","0AV","0AW","0AX","0AY","0AZ","0BA","0BB","0BC","0BD","0BE","0BF","0BG","0BL","0BM","0BN","0BO","0BP",
"0BQ","0BR","0BS","0BT","0BU","0BV","0BW","0BX","0BY","0BZ","0CA","0CB","0CC","0CD","0CE","0CF","0CG","0CH","0CI","0CJ",
"0CK","0CL","0CM","0CN","0CO","0CP","0CQ","0CR","0E1","0FR","0FS","0GR","0GS","0HR","0HS","0OR","0OS","1BR","1D0","1DB",
"1DZ","1F0","1F1","1F2","1F3","1F4","1FZ","1G0","1G1","1G2","1G3","1G4","1LA","1LD","1LM","1LW","1PS","1S0","1S1","1S2",
"1S3","1S4","1SA","1SB","1SC","1SD","1SE","1SZ","1T0","1T1","1T2","1T3","1T4","1VF","1WK","24A","24B","24C","24D","24E",
"24F","24G","24H","24I","2D0","2DZ","2F0","2F1","2F2","2F3","2F4","2FZ","2G0","2G1","2G2","2G3","2G4","2S0","2S1","2S2",
"2S3","2S4","2SZ","2T0","2T1","2T2","2T3","2T4","30C","30P","30V","3DS","3PF","3PS","42R","42S","43R","43S","44R","44S",
"4DS","4WK","55C","55D","55E","55F","55O","55P","55S","55W","7AF","7AS","7BR","7BS","7CA","7CT","7D1","7DA","7FF","7FS",
"7OP","7PS","91A","91B","91C","91D","91G","91H","91I","91J","91K","92A","92B","92G","93A","93B","94A","94B","95A","95B",
"96A","96B","97A","97B","98A","98B","98C","98D","98F","98G","98H","98I","98J","98K","98L","98M","98N","98P","98R","98S",
"98T","98U","98V","98W","98X","98Y","99A","99B","99C","99D","99E","99F","99G","99H","99I","99J","99K","99L","99M","99N",
"99O","99P","99Q","99R","99S","99T","99U","99V","99W","99X","99Y","99Z","A02","A03","A04","A05","A40","A41","A42","A43",
"A44","A60","A61","A62","A63","A64","ACP","ACS","ADC","ADM","AFS","ALO","ALP","ALT","APR","AR1","AR2","ARM","ARN","ARR",
"AS1","AS2","ASV","ATR","ATS","ATT","ATV","ATY","AVN","AVP","AVR","AWR","B1R","B1S","B2R","B2S","B55","BAS","BB4","BBB",
"BBR","BBT","BC1","BC2","BCF","BCR","BCS","BD1","BD2","BDA","BDD","BDU","BED","BG1","BMA","BMB","BMC","BMJ","BMS","BOP",
"BOR","BPH","BPR","BQS","BRR","BS1","BT1","BT2","BVR","BVV","BZ1","BZ2","BZ9","BZZ","C13","C14","C28","C2W","C4W","CA1",
"CA2","CAC","CAH","CAN","CAR","CB1","CCB","CCR","CCS","CDE","CE2","CEF","CFF","CFP","CFS","CFT","CH1","CH2","CHA","CHR",
"CL1","CL2","CLA","CLS","CM1","CM2","CNE","CNM","CNR","CNS","COA","COB","COH","COL","COM","COR","COS","CPF","CPP","CPR",
"CPS","CQP","CR1","CR2","CSA","CST","CT1","CTM","CTW","CWR","CWS","CYC","CZS","DAA","DAF","DDO","DEF","DPC","DRS","DS1",
"DS4","DSD","DST","DTA","DTE","DTF","DTP","E40","E41","E42","E43","E44","E60","E61","E62","E63","E64","EAR","EAS","EBP",
"ECS","EDA","EDF","EDR","EDS","EFR","EFS","EGG","EJA","EJB","EJC","EJD","ELF","ELR","ELS","ELV","EM0","EM2","EM3","EM4",
"EM5","EM6","EMB","EMD","EME","EOR","EOS","EPT","ES1","ES2","ES3","ES4","ES5","ES6","ESC","ESP","EVE","EVF","EVR","EVS",
"EWR","EXV","F1F","F1L","F2F","F55","F56","FAW","FB0","FB1","FB2","FB3","FB4","FBD","FBM","FBW","FC1","FC2","FC3","FC4",
"FCB","FCF","FCP","FCU","FCV","FCW","FES","FFA","FFF","FFM","FFO","FFP","FFT","FFW","FFY","FMM","FMR","FMS","FMW","FND",
"FP5","FP6","FPL","FPR","FPT","FPZ","FS0","FS1","FS2","FS3","FS4","FSD","FSF","FSL","FSP","FST","FTA","FTB","FTD","FTF",
"FTP","FTR","FTS","FTT","FUS","FWE","FWF","FXC","FXR","FZP","FZS","G10","G15","G1Y","G1Z","GA2","GA5","GAT","GAX","GB1",
"GCF","GCK","GCL","GCP","GCX","GCY","GCZ","GEU","GF7","GGG","GGW","GGX","GLR","GLS","GMM","GMW","GMY","GP1","GP2","GPA",
"GPB","GPC","GPD","GPE","GPF","GPS","GT3","GT5","GVR","GXC","GXO","GXR","GXS","GYA","GYF","H1F","HAA","HAB","HAC","HAD",
"HAE","HAF","HAG","HAS","HC2","HCA","HCB","HCD","HCE","HCF","HCG","HCH","HCI","HCJ","HCK","HCL","HCM","HCN","HCO","HCP",
"HCQ","HCR","HCU","HCV","HCW","HCX","HEA","HEB","HEF","HEG","HER","HES","HF2","HF3","HF4","HFC","HFF","HGF","HH1","HH2",
"HHH","HL1","HL2","HLC","HMC","HNC","HPA","HPC","HPF","HPP","HPR","HS7","HTD","HU2","HU3","HU4","HUA","HUB","HUC","HZ1",
"HZ2","HZ3","HZ4","I1H","IF1","IF3","IFR","IFS","IS0","IS1","IS3","ISR","ISS","IT1","IT2","ITS","IXF","IXS","K4Q","K4R",
"K4S","KFF","KGF","L1R","L2R","LBT","LCF","LG2","LG3","LG4","LG5","LGR","LME","LMM","LNO","LNR","LOG","LSS","LVR","LYE",
"LYF","MBA","MBB","MBC","MBD","MCA","MCM","MCQ","MCR","MCW","MFB","MKS","MLA","MLM","MLW","MM1","MM2","MMA","MMB","MMC",
"MMD","MML","MMM","MMP","MMQ","MMR","MRM","MRT","MRW","MRY","MSB","MSS","MST","MSV","MSW","MTY","MXR","ND1","ND2","ND3",
"ND4","ND5","ND6","ND7","ND8","NDM","NDN","NDR","NDS","NFT","NN1","NN2","NN3","NNP","NNR","NS1","NT3","NWM","O2C","O2R",
"OC1","OC2","OD1","OD2","ODF","OLD","OLT","OMS","OPB","OPM","OPN","OPO","ORR","OTA","OTM","OTU","OTW","OVN","OZR","PAP",
"PAR","PAS","PBA","PBM","PBQ","PCF","PCS","PFW","PLA","PMB","PMP","PMR","PMS","PNF","POP","PRA","PRT","PSA","PSB","PSG",
"PSR","PSV","PWS","QAA","QAB","QPD","QPK","QPM","QPO","QPS","QSV","QSW","R01","R12","R14","R28","R29","R30","R71","R81",
"R91","RA1","RAD","RAE","RCS","RDD","RF7","RFM","RGP","RGR","RM7","RMA","RMM","RMP","RP2","RP3","RP4","RPA","RPM","RPW",
"RSS","RTM","RUG","RV3","RV4","RV8","RVE","RVF","RVR","RX7","RXM","S01","S02","S03","S04","S05","S06","S07","S08","S09",
"S10","S11","S12","S13","S14","S15","S16","S17","S18","S19","S20","S55","S56","SAA","SAB","SAC","SAD","SAG","SAH","SAI",
"SAJ","SAK","SAL","SAM","SAN","SAO","SAP","SAQ","SAR","SAW","SAX","SB0","SB1","SB2","SB3","SB4","SBD","SBE","SBF","SBG",
"SBH","SC1","SC2","SC3","SC4","SC5","SC6","SC7","SCA","SCF","SCM","SCP","SD1","SD4","SDF","SDG","SDH","SDI","SDJ","SDK",
"SDL","SDP","SDT","SDW","SE1","SEA","SEC","SER","SES","SFA","SFB","SFF","SFG","SFL","SFM","SFN","SFP","SFR","SFS","SGA",
"SGP","SGR","SH0","SH1","SH2","SH3","SH4","SHF","SHS","SI1","SI2","SIH","SJ1","SJ2","SL1","SL2","SL3","SL4","SL5","SMG",
"SMO","SN2","SNF","SNO","SNP","SNR","SNS","SNT","SNU","SO3","SOC","SOF","SOG","SOH","SOI","SOP","SOW","SOX","SP3","SP4",
"SPN","SPO","SPP","SPQ","SPU","SRF","SS3","SSC","SSE","SSF","SSG","SSJ","SSK","SSL","SSM","SSN","SST","SSU","STA","STM",
"STR","STS","SUG","SUS","SV3","SVB","SWU","SXD","SXF","SXG","SZ7","SZS","TAP","TF4","TFF","TFH","TFL","TFS","TMA","TMM",
"TMW","TQ1","TQ2","TSH","TSL","TTN","TVS","TWC","U20","U25","U30","U35","U40","U45","U50","U70","UBB","UPG","VAL","VCA",
"VCB","VCC","VCD","VCE","VCF","VFA","VFB","VFC","VFD","VFE","VFG","VFP","VIF","VIS","VJF","VJS","VKF","VKS","VP1","VP2",
"VSG","VSR","VT1","VT2","VT3","VT5","VTR","VUO","VUR","VVR","VW1","VWD","VWU","VYR","VZP","VZR","W6A","W6M","W6Q","W6W",
"W7A","W7M","W7Q","W7W","WA1","WA2","WA3","WA4","WA5","WA6","WA7","WAD","WAP","WB1","WB2","WB3","WB4","WB5","WC1","WC2",
"WC3","WCC","WET","WFU","WKU","WMX","WOD","WOR","WOS","WR3","WR4","WRO","WSO","WSP","WSS","WUG","WUR","WUS","WW1","X1C",
"X2C","XBR","XC3","XC4","XC5","XC6","XC7","XC8","XC9","XCT","XCU","XDR","XLF","XS1","XS2","XS5","XS6","ZN4","ZNA","ZNW",
"ZNX","ZO1","ZO2","ZO3","ZO4","ZOP","ZPO","ZZV","ZZW","ZZX","ZZY","ZZZ"`;

const RESTRICTION_DATE_TABLES = ["restriction_time_date", "restriction_ticket_calendar", "restriction_train_date", "restriction_header_date"];
const TABLE_UPDATES = RESTRICTION_DATE_TABLES.map(t => `ALTER TABLE ${t} ADD COLUMN start_date DATE, ADD COLUMN end_date DATE`);

const QUERIES = [
  `DELETE FROM fare WHERE fare < 50 OR ticket_code IN (${TICKET_CODE_BLACKLIST})`,
  `DELETE FROM ticket_type WHERE ticket_code IN (${TICKET_CODE_BLACKLIST})`,
  "DELETE FROM flow WHERE usage_code = 'G'",
  "DELETE FROM flow WHERE flow_id NOT IN (SELECT flow_id FROM fare)",
  "DELETE FROM location WHERE end_date < CURDATE()",
  "DELETE FROM status_discount WHERE end_date < CURDATE()",
  "DELETE FROM status WHERE end_date < CURDATE()",
  "DELETE FROM route_location WHERE end_date < CURDATE()",
  "DELETE FROM route WHERE end_date < CURDATE()",
  `DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE()`,
  `DELETE FROM non_derivable_fare_override WHERE ticket_code IN (${TICKET_CODE_BLACKLIST})`,
  `DELETE FROM non_derivable_fare_override WHERE end_date < CURDATE() OR composite_indicator != 'Y' OR adult_fare < 50 OR child_fare < 50`,
  "UPDATE non_derivable_fare_override SET adult_fare = null WHERE adult_fare = 99999 OR adult_fare > 999999",
  "UPDATE non_derivable_fare_override SET child_fare = null WHERE child_fare = 99999 OR child_fare > 999999",
  `DELETE FROM non_standard_discount WHERE end_date < CURDATE()  OR ticket_code IN (${TICKET_CODE_BLACKLIST})`,
  `DELETE FROM railcard WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS})`,
  `DELETE FROM location_railcard WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS})`,
  `DELETE FROM railcard_minimum_fare WHERE end_date < CURDATE() OR railcard_code NOT IN (${ACCEPTED_RAILCARDS}) OR ticket_code IN (${TICKET_CODE_BLACKLIST})`,
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
  "UPDATE railcard SET child_status = null WHERE child_status='XXX' OR (child_status='001' AND railcard_code != '   ')",
  "UPDATE status_discount SET discount_indicator = 'X' WHERE status_code != '000' and status_code != '001' AND discount_percentage = 0",
];


export class CleanFaresCommand implements CLICommand {

  constructor(private readonly db: DatabaseConnection) {}

  /**
   * Clean out expired data, update the schema to have start_date and end_date then populate those fields
   */
  public async run(argv: string[]): Promise<void> {
    try {
      console.log("Removing old and irrelevant fares data");
      await Promise.all([
        ... QUERIES.map(q => this.queryWithRetry(q)),
        ... TABLE_UPDATES.map(q => this.queryWithSilentFailure(q))
      ]);

      console.log("Applying restriction dates");
      const [[current, future]] = await this.db.query<RestrictionDateRow[]>("SELECT * FROM restriction_date ORDER BY cf_mkr");

      current.start_date = new Date(current.start_date.getFullYear(), 1, 1);

      await Promise.all(
        RESTRICTION_DATE_TABLES.map(tableName => this.updateRestrictionDatesOnTable(tableName, current, future))
      );
    }
    catch (err) {
      console.error(err);
    }

    return this.db.end();
  }

  private async updateRestrictionDatesOnTable(tableName: string, current: RestrictionDateRow, future: RestrictionDateRow): Promise<any> {
    const [records] = await this.db.query<RestrictionRow[]>(`SELECT * FROM ${tableName}`);
    const promises = records.map(record => {
      const date = record.cf_mkr === 'C' ? current : future;
      const startDate = this.getFirstDateAfter(date.start_date, record.date_from);
      const endDate = this.getFirstDateAfter(startDate.toDate(), record.date_to);

      if (startDate.isAfter(endDate)) {
        throw new Error(`Error processing ${record} start date after end date: ${startDate.format("YYYY-MM-DD")} ${endDate.format("YYYY-MM-DD")}`);
      }
      else {
        return this.db.query(`UPDATE ${tableName} SET start_date = ?, end_date = ? WHERE id = ?`, [
          startDate.format("YYYY-MM-DD"),
          endDate.format('YYYY-MM-DD'),
          record.id
        ]);
      }
    });

    return Promise.all(promises);
  }

  /**
   * Given a short form restriction month MMDD this method will return the first instance of that date that occurs
   * after the given date. For example with a restriction date of 2017-06-01 the earliest date of 0301 is 2018-03-01
   */
  private getFirstDateAfter(earliestDate: Date, restrictionMonth: string): Moment {
    const earliestMonth = moment(earliestDate).format("MMDD");
    const yearOffset = (parseInt(earliestMonth) > parseInt(restrictionMonth)) ? 1 : 0;

    return moment((earliestDate.getFullYear() + yearOffset) + restrictionMonth, "YYYYMMDD");
  }

  private async queryWithRetry(query: string, max: number = 3, current: number = 1): Promise<void> {
    try {
      await this.db.query(query)
    }
    catch (err) {
      if (current >= max) {
        throw err;
      }
      else {
        await this.queryWithRetry(query, max, current + 1);
      }
    }
  }

  private async queryWithSilentFailure(query: string): Promise<void> {
    try {
      await this.db.query(query)
    }
    catch (err) { }
  }
}

interface RestrictionRow {
  cf_mkr: "C" | "F";
  date_from: string;
  date_to: string;
  id: number;
}

interface RestrictionDateRow {
  start_date: Date;
  end_date: Date;
}