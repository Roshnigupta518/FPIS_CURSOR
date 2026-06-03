/**
 * Facility master data + helpers for resolving the facility list
 * shown on the Facility Selection screen depending on login type.
 */

export const LOGIN_TYPES = {
  BLOCK: 'Block Level',
  DISTRICT: 'District Hospital',
  MEDICAL: 'medical',
};

export const FACILITY_TYPES = {
  CHC: 'CHC',
  CH: 'CH',
  PHC: 'PHC',
  DH: 'DH',
  MC: 'MC',
};

export const FACILITIES = {
  [FACILITY_TYPES.CHC]: {
    id: FACILITY_TYPES.CHC,
    type: FACILITY_TYPES.CHC,
    name: 'Community Health Centre',
    nameHi: 'सामुदायिक स्वास्थ्य केंद्र',
    description: 'Block-level community healthcare facility',
  },
  [FACILITY_TYPES.CH]: {
    id: FACILITY_TYPES.CH,
    type: FACILITY_TYPES.CH,
    name: 'Civil Hospital',
    nameHi: 'सिविल अस्पताल',
    description: 'Civil hospital under block administration',
  },
  [FACILITY_TYPES.PHC]: {
    id: FACILITY_TYPES.PHC,
    type: FACILITY_TYPES.PHC,
    name: 'Primary Health Centre',
    nameHi: 'प्राथमिक स्वास्थ्य केंद्र',
    description: 'Primary healthcare facility',
  },
  [FACILITY_TYPES.DH]: {
    id: FACILITY_TYPES.DH,
    type: FACILITY_TYPES.DH,
    name: 'District Hospital',
    nameHi: 'जिला अस्पताल',
    description: 'District-level hospital',
  },
  [FACILITY_TYPES.MC]: {
    id: FACILITY_TYPES.MC,
    type: FACILITY_TYPES.MC,
    name: 'Medical College',
    nameHi: 'मेडिकल कॉलेज',
    description: 'Medical college and teaching hospital',
  },
};

/**
 * Returns the list of facilities available for a given login type.
 * Block login returns a multi-option list; the other two preselect a single
 * facility but the user must still tap Continue.
 */
export const getFacilitiesForLoginType = loginType => {
  switch (loginType) {
    case LOGIN_TYPES.BLOCK:
      return [
        FACILITIES[FACILITY_TYPES.CHC],
        FACILITIES[FACILITY_TYPES.CH],
        FACILITIES[FACILITY_TYPES.PHC],
      ];
    case LOGIN_TYPES.DISTRICT:
      return [FACILITIES[FACILITY_TYPES.DH]];
    case LOGIN_TYPES.MEDICAL:
      return [FACILITIES[FACILITY_TYPES.MC]];
    default:
      return [];
  }
};

export const isPreselectedLoginType = loginType =>
  loginType === LOGIN_TYPES.DISTRICT || loginType === LOGIN_TYPES.MEDICAL;
