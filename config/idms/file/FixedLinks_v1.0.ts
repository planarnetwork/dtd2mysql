import {XmlFile} from "../../../src/feed/file/XmlFile";
import {ParsedRecord, RecordAction} from "../../../src/feed/record/Record";
import {ALFRecord} from "../../timetable/file/ALF";

class FixedLinkRecord extends ALFRecord {
    public readonly name: string = "idms_fixed_link";

    public extractValues(link: any): ParsedRecord {
        if (typeof link.daysofweek === 'string') {
            link.daysofweek = [link.daysofweek];
        }
        if (!link.daysofweek.filter) {
            console.log(link);
            process.exit(0);
        }
        const values = {
            id: null,
            mode: link.transportmode,
            origin: link.origin.crs,
            destination: link.destination.crs,
            duration: parseInt(link.duration),
            start_time: link.starttime + ':00',
            end_time: link.endtime + ':00',
            priority: parseInt(link.priority),
            start_date: link.startdate,
            end_date: link.enddate,
            monday: link.daysofweek.filter(day => day === 'Mon').length,
            tuesday: link.daysofweek.filter(day => day === 'Tue').length,
            wednesday: link.daysofweek.filter(day => day === 'Wed').length,
            thursday: link.daysofweek.filter(day => day === 'Thu').length,
            friday: link.daysofweek.filter(day => day === 'Fri').length,
            saturday: link.daysofweek.filter(day => day === 'Sat').length,
            sunday: link.daysofweek.filter(day => day === 'Sun').length,
        };

        return {action: RecordAction.Insert, values};
    }

    orderedInserts: false;
}

export interface IdmsFixedLinkRecord {
    origin: {
        crs: string, // '1DA' 
        name: string, // 'Tower Gateway' 
        nlc: string, // 'DL27' 
    },
    destination: {
        crs: string, // 'SRA'
        name: string, // 'Stratford (London)'
        nlc: string, // '6969'
        tiploc: string, // 'STFD' 
    },
    transportmode: string, // 'TRANSFER'
    startdate: string, // '2010-10-01'
    enddate: string, // '2999-12-31'
    starttime: string, // '00:00'
    endtime: string, // '23:59'
    daysofweek: string[], // [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ]
    daysmask: string, // '1111110'
    duration: string, // '60'
    priority: string,
    londonzones: {
        minzone: string, // '1'
        maxzone: string, // '3', 
    },
    advicemessage: string
}

const FixedLinks_v10 = new XmlFile(new FixedLinkRecord());

export default FixedLinks_v10;
