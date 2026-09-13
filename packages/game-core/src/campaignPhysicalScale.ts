import { CITY_RUN_SPEED } from "./cityUnitTrial";
import { STUDY_TRAVEL_MULTIPLIER } from "./timedSettlementStudy";
/** Shared scale-test geography conversion. Local meshes and weapon ranges stay unchanged. */
export const CAMPAIGN_MODEL_PER_WORLD =
  (CITY_RUN_SPEED * 3600) / (100 * 0.6 * STUDY_TRAVEL_MULTIPLIER);
