import type {bakeInfantry} from "../infantryModel";
export type PreviewCover="none"|"partial"|"full";
export const tacticalPreviewColor=(valid:boolean,cover:PreviewCover)=>!valid?0xff6655:cover==="full"?0x75e299:cover==="partial"?0xffd16c:0xa4cddd;
export const tacticalPreviewPose=(rig:ReturnType<typeof bakeInfantry>,cover:PreviewCover)=>
  cover==="full"?rig.pose("aim",.9,0,.25,.35):cover==="partial"?rig.pose("aim",.9,0,.7,0):rig.pose("aim",.9);
