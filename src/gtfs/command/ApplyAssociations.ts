
import {Association} from "../native/Association";
import {OverlayIndex} from "./ApplyOverlays";

export function applyAssociations(schedulesByTuid: OverlayIndex, associations: Association[]): OverlayIndex {
  // for (const association of associations) {
  //   const baseSchedule = association.getBaseSchedule(schedulesByTuid[association.baseTUID]);
  //   const assocSchedule = association.getAssocSchedule(schedulesByTuid[association.assocTUID]);
  //
  //   // replace the assoc schedule with the new version
  //   schedulesByTuid[association.assocTUID] = schedulesByTuid[association.assocTUID]
  //     .filter(s => s != assocSchedule)
  //     .concat(association.apply(baseSchedule, assocSchedule));
  // }

  return schedulesByTuid;
}
