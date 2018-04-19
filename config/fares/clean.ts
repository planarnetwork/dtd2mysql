export const acceptedRailcards = "'','YNG','DIS','DIC','FAM','HMF','NGC','NEW','SRN','2TR','GS3','JCP'";

export const ticketCodeWhitelist = `
"1AB","1AF","1AS","1BB","1BF","1BS","1CB","1CF","1CS","1DB","1DF","1DS","1EF","1ES","1FF","1FS","1GF","1GS","1HF","1HS",
"1JF","1JS","1KF","1KS","1SO","1SS","1ST","2AA","2AF","2AS","2BF","2BS","2CC","2CF","2CS","2DC","2DF","2DS","2EC","2EF",
"2ES","2FB","2FC","2FF","2FI","2FS","2GB","2GC","2GF","2GI","2GS","2HC","2HF","2HS","2IA","2IB","2IC","2ID","2IE","2IF",
"2IG","2IH","2II","2IJ","2IS","2JC","2JF","2JS","2KC","2KF","2KS","2LC","2MC","2MF","2NF","AA1","AB1","AD1","ADT","AE1",
"AF1","AG1","AG2","AH1","AH2","AI1","AI2","AJ2","AK2","AL2","AM3","AN2","AO2","AP2","AVK","AVL","AVO","AVP","AW1","AXS",
"B1R","B1S","B2R","B2S","BAO","BBO","BCO","BDO","BFO","BFR","BFS","BGO","BHO","BPS","BRS","BSS","BSZ","BTS","BUS","BVR",
"BVS","BXS","BXZ","BYS","BZS","C1R","C1S","C1X","C2R","C2S","C2X","C3S","C3X","C3Y","C4B","C4S","C4X","C4Y","C5B","C5X",
"C5Y","C6B","C6Y","C6Z","C7B","C7S","C7Z","C8B","C8Z","CBA","CBB","CDR","CDS","CFT","CME","CRF","CRU","DAS","DBS","DCS",
"DDS","DES","DFS","DG1","DG2","DG3","DG4","DG5","DG6","DG7","DG8","DG9","DGS","DHS","DJS","DKS","DLS","DRG","DRI","DUO",
"DUS","E1R","E1S","E2R","E2S","E3R","E4R","E4S","ECD","ECR","EGF","EGP","EGS","EMB","EMD","EME","ETR","F1A","F1V","F2A",
"F2V","F3A","F3V","F4A","F4V","F5A","F6A","F7A","F7V","F8A","F9A","FAS","FAV","FBS","FCD","FCR","FCS","FDA","FDB","FDR",
"FDS","FDT","FG3","FG4","FG5","FGR","FGS","FHR","FIS","FNW","FOR","FOS","FPP","FRX","FS0","FS1","FS2","FS3","FS4","FSA",
"FSB","FSC","FSO","FSR","FSS","FSX","FTC","FXR","FXS","FZL","FZP","G1R","G1S","G2F","G2R","G2S","G3F","G4F","GC3","GC4",
"GC5","GC6","GC7","GC8","GCA","GCB","GCD","GCE","GCG","GCH","GCI","GCJ","GCQ","GCR","GCS","GCT","GCU","GCV","GDR","GDS",
"GE1","GF3","GF4","GF5","GFR","GFS","GO3","GO5","GOR","GP3","GP5","GR3","GR4","GR5","GTR","GTS","GUR","GUS","GVR","HEA",
"HEB","HEC","HED","HOR","HOS","HT1","HT2","HT4","HTA","HTS","HTT","HV0","HV1","HV2","HV3","HV4","HV5","HX1","HX4","HX7",
"HX9","HZ0","HZ6","I1A","I1B","I1C","I1D","I1E","I1F","I1G","I1H","I1I","JAS","JBS","JCS","JDS","JES","JFS","JGS","JHS",
"LFB","LSR","MAF","MAS","MBF","MBS","MCF","MCS","MDF","MDS","MEF","MES","MFF","MFS","MGF","MGS","MHS","MIA","MIB","MID",
"MIF","MIS","MJF","MJS","MMS","NBA","NCA","NDA","NEA","NXO","NXP","OAS","OBS","OBZ","OCS","OCZ","ODS","ODT","OES","OF1",
"OF2","OF3","OF4","OF5","OF6","OFY","OFZ","OGS","OHS","OJS","OPB","OPD","OPF","OPR","OPS","OS1","OS2","OS3","OS4","OS5",
"OS6","OSC","OSR","OSY","OSZ","OTF","PDR","PDS","S1A","S2A","S3A","S4A","S5A","S6A","S7A","S8A","S9A","SAS","SAV","SBV",
"SCO","SCV","SDR","SDS","SDV","SE3","SE4","SED","SEE","SEF","SGD","SHR","SLA","SLD","SOA","SOB","SOC","SOD","SOE","SOF",
"SOG","SOH","SOI","SOP","SOR","SOS","SOT","SPG","SPR","SPS","SQF","SRR","SS2","SSR","SSS","STO","STP","SVR","SVS","SWS",
"SZL","UFA","UFB","UFC","UFD","UFE","UFF","UFG","UFH","UFI","USA","USB","USC","USD","USE","USF","USG","USH","USI","USJ",
"USK","USW","USX","USY","USZ","V1A","V1B","V1C","V1D","V1E","V1F","V1G","V1H","V1I","V1J","V1K","V1L","V1M","V1N","V1O",
"V1P","V1Q","V1R","V1S","V1T","V1U","V1V","V1W","V1X","V1Y","V1Z","V2A","V2B","V2C","V2D","V2E","V2F","V2G","V2H","V2I",
"V2J","V2K","V2L","V2M","V2N","V2O","V2P","V2Q","V2R","V2S","V2T","V2U","V2V","V2W","V2X","V2Y","V2Z","VA1","VA2","VA3",
"VA4","VA5","VA6","VAS","VBR","VBS","VCS","VDS","VER","VES","VVF","VZP","W1A","W1C","W1E","W1G","W1H","W1J","W1L","W1N",
"W1O","W1P","W1Q","W1R","W1S","W1T","W2A","W2B","W2C","W2D","W2E","W2F","W2G","W2H","W2I","W2J","W2K","W2L","W2M","W2N",
"W2O","W2P","W2Q","W2R","W2S","W2T","WAS","WBS","WCS","WDS","WDT","WES","WFS","WGS","WHS","WJS","WK1","WK2","WK3","WKS",
"WLS","WRE","WTC","XAF","XBF","XBR","XC1","XCF","XDF","XEF","XFF","XGF","XP1","XP2","XS1","XS2","XS3","XS5","XS6","XS8"
`;

export const restrictionTables = ["restriction_time_date", "restriction_ticket_calendar", "restriction_train_date", "restriction_header_date"];
