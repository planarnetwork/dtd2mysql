
export type AgencyID = string;

export interface Agency {
  agency_id: AgencyID;
  agency_name: string;
  agency_url: string;
  agency_timezone: string;
  agency_lang: string;
  agency_phone: string;
  agency_fare_url: string | null;
}