import Constants from "expo-constants";

/** This is a release gate, not authentication or a substitute for privacy review. */
export const LOCAL_CSV_PILOT_ENABLED =
  Constants.expoConfig?.extra?.localCsvPilotBuildAllowed === true &&
  process.env.EXPO_PUBLIC_AGENTPAY_CSV_PILOT === "enabled" &&
  process.env.EXPO_PUBLIC_AGENTPAY_CSV_PILOT_PROFILE === "csv-pilot-internal";
