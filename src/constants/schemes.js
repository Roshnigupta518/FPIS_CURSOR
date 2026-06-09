import {FACILITY_TYPES} from './facilities';

export const SCHEME_KEYS = {
  MALE_STERILIZATION: 'MALE_STERILIZATION',
  FEMALE_STERILIZATION: 'FEMALE_STERILIZATION',
  ANTARA_INJECTION: 'ANTARA_INJECTION',
  PPIUCD: 'PPIUCD',
  COMPENSATION: 'COMPENSATION',
};

export const SCHEMES = {
  [SCHEME_KEYS.MALE_STERILIZATION]: {
    id: SCHEME_KEYS.MALE_STERILIZATION,
    code: 'NSV',
    name: 'Male Sterilization',
    nameHi: 'पुरुष नसबंदी',
    description: 'No-scalpel vasectomy (NSV) procedure',
    descriptionHi: 'पुरुष नसबंदी (NSV) प्रक्रिया',
    icon: 'male',
  },
  [SCHEME_KEYS.FEMALE_STERILIZATION]: {
    id: SCHEME_KEYS.FEMALE_STERILIZATION,
    code: 'FST',
    name: 'Female Sterilization',
    nameHi: 'महिला नसबंदी',
    description: 'Tubectomy / minilap / laparoscopic sterilization',
    descriptionHi: 'महिला नसबंदी प्रक्रिया',
    icon: 'female',
  },
  [SCHEME_KEYS.ANTARA_INJECTION]: {
    id: SCHEME_KEYS.ANTARA_INJECTION,
    code: 'ANT',
    name: 'Antara Contraceptive Injection',
    nameHi: 'अंतरा गर्भनिरोधक इंजेक्शन',
    description: 'Quarterly contraceptive injection',
    descriptionHi: 'त्रैमासिक गर्भनिरोधक इंजेक्शन',
    icon: 'syringe',
  },
  [SCHEME_KEYS.PPIUCD]: {
    id: SCHEME_KEYS.PPIUCD,
    code: 'PPIUCD',
    name: 'Postpartum IUCD Insertion',
    nameHi: 'प्रसव पश्चात आईयूसीडी इंसर्शन',
    description: 'IUCD insertion within 48 hours of delivery',
    descriptionHi: 'प्रसव के 48 घंटे के भीतर आईयूसीडी',
    icon: 'baby',
  },
  [SCHEME_KEYS.COMPENSATION]: {
    id: SCHEME_KEYS.COMPENSATION,
    code: 'FPCS',
    name: 'Family Planning Compensation Scheme',
    nameHi: 'परिवार नियोजन क्षतिपूर्ति योजना',
    description: 'Compensation for family planning beneficiaries',
    descriptionHi: 'परिवार नियोजन लाभार्थियों हेतु क्षतिपूर्ति',
    icon: 'shield',
  },
};

export const FACILITY_SCHEME_MAP = {
  [FACILITY_TYPES.CHC]: [
    SCHEME_KEYS.MALE_STERILIZATION,
    SCHEME_KEYS.FEMALE_STERILIZATION,
    SCHEME_KEYS.ANTARA_INJECTION,
    SCHEME_KEYS.PPIUCD,
    SCHEME_KEYS.COMPENSATION,
  ],
  [FACILITY_TYPES.CH]: [
    SCHEME_KEYS.FEMALE_STERILIZATION,
    SCHEME_KEYS.ANTARA_INJECTION,
    SCHEME_KEYS.PPIUCD,
    SCHEME_KEYS.COMPENSATION,
  ],
  [FACILITY_TYPES.PHC]: [
    SCHEME_KEYS.ANTARA_INJECTION,
    SCHEME_KEYS.COMPENSATION,
  ],
  [FACILITY_TYPES.DH]: [
    SCHEME_KEYS.MALE_STERILIZATION,
    SCHEME_KEYS.FEMALE_STERILIZATION,
    SCHEME_KEYS.ANTARA_INJECTION,
    SCHEME_KEYS.PPIUCD,
    SCHEME_KEYS.COMPENSATION,
  ],
  [FACILITY_TYPES.MC]: [
    SCHEME_KEYS.MALE_STERILIZATION,
    SCHEME_KEYS.FEMALE_STERILIZATION,
    SCHEME_KEYS.ANTARA_INJECTION,
    SCHEME_KEYS.PPIUCD,
    SCHEME_KEYS.COMPENSATION,
  ],
};

export const getSchemesForFacility = facilityType => {
  const keys = FACILITY_SCHEME_MAP[facilityType] || [];
  return keys.map(k => SCHEMES[k]);
};

/**
 * Map an API scheme object (e.g. { id: 1, scheme_name, scheme_name_e })
 * to one of our local SCHEME_KEYS so we can drive form fields off it.
 */
export const getSchemeKeyFromApi = apiScheme => {
  if (!apiScheme) return null;
  if (apiScheme.key && SCHEMES[apiScheme.key]) return apiScheme.key;
  if (typeof apiScheme === 'string' && SCHEMES[apiScheme]) return apiScheme;

  const nameE = String(
    apiScheme.scheme_name_e || apiScheme.name || '',
  ).toLowerCase();

  if (
    nameE.includes('male sterilization') ||
    nameE.includes('vasectomy') ||
    nameE.includes('nsv')
  ) {
    return SCHEME_KEYS.MALE_STERILIZATION;
  }
  if (
    nameE.includes('female sterilization') ||
    nameE.includes('tubectomy')
  ) {
    return SCHEME_KEYS.FEMALE_STERILIZATION;
  }
  if (nameE.includes('antara')) return SCHEME_KEYS.ANTARA_INJECTION;
  if (nameE.includes('ppiucd') || nameE.includes('postpartum')) {
    return SCHEME_KEYS.PPIUCD;
  }
  if (nameE.includes('compensation')) return SCHEME_KEYS.COMPENSATION;

  return null;
};

/* -------------------------------------------------------------------------- */
/*  BENEFICIARY STATUS                                                        */
/* -------------------------------------------------------------------------- */

export const BENEFICIARY_STATUS = {
  PENDING_AUTH: 'PENDING_AUTH',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_FAILED: 'AUTH_FAILED',
  SUBMITTED: 'SUBMITTED',
};

export const STATUS_META = {
  [BENEFICIARY_STATUS.PENDING_AUTH]: {
    label: 'Pending Authentication',
    labelHi: 'प्रमाणीकरण लंबित',
    color: '#E68A00',
    bg: '#FFF4E0',
  },
  [BENEFICIARY_STATUS.AUTH_SUCCESS]: {
    label: 'Authenticated',
    labelHi: 'प्रमाणित',
    color: '#138A36',
    bg: '#E6F4EA',
  },
  [BENEFICIARY_STATUS.AUTH_FAILED]: {
    label: 'Authentication Failed',
    labelHi: 'प्रमाणीकरण विफल',
    color: '#D32F2F',
    bg: '#FDECEA',
  },
  [BENEFICIARY_STATUS.SUBMITTED]: {
    label: 'Submitted',
    labelHi: 'सबमिट किया गया',
    color: '#08487E',
    bg: '#E6F0FA',
  },
};

/* -------------------------------------------------------------------------- */
/*  DYNAMIC FORM FIELD DEFINITIONS                                            */
/* -------------------------------------------------------------------------- */

const BASE_FIELDS = [
  {
    key: 'beneficiaryName',
    label: 'Beneficiary Name',
    labelHi: 'लाभार्थी का नाम',
    type: 'name',
    regex: 'NAME',
    required: true,
    maxLength: 60,
  },
  {
    key: 'age',
    label: 'Age',
    labelHi: 'आयु',
    type: 'number',
    regex: 'AGE',
    required: true,
    keyboardType: 'number-pad',
    maxLength: 3,
  },
  {
    key: 'guardianName',
    label: "Father / Husband's Name",
    labelHi: 'पिता / पति का नाम',
    type: 'name',
    regex: 'NAME',
    required: true,
    maxLength: 60,
  },
  {
    key: 'samagraId',
    label: 'Samagra ID',
    labelHi: 'समग्र आईडी',
    type: 'number',
    regex: 'SAMAGRA_ID',
    required: true,
    keyboardType: 'number-pad',
    maxLength: 9,
  },
  {
    key: 'mobile',
    label: 'Mobile Number',
    labelHi: 'मोबाइल नंबर',
    type: 'number',
    regex: 'MOBILE',
    required: false,
    keyboardType: 'phone-pad',
    maxLength: 10,
  },
  {
    key: 'address',
    label: 'Address',
    labelHi: 'पता',
    type: 'text',
    regex: 'ADDRESS',
    required: false,
    multiline: true,
    maxLength: 200,
  },
  // {
  //   key: 'procedureDate',
  //   label: 'Procedure Date',
  //   labelHi: 'प्रक्रिया की तिथि',
  //   type: 'date',
  //   required: true,
  //   mode: 'date',
  // },
  // {
  //   key: 'doctorName',
  //   label: 'Doctor Name',
  //   labelHi: 'डॉक्टर का नाम',
  //   type: 'name',
  //   regex: 'NAME',
  //   required: true,
  //   maxLength: 60,
  // },
  {
    key: 'facilityName',
    label: 'Facility Name',
    labelHi: 'सुविधा का नाम',
    type: 'text',
    regex: 'TEXT',
    required: true,
    readOnly: true,
  },
];

const CLAIM_FIELD = {
  key: 'claimId',
  label: 'Claim ID',
  labelHi: 'क्लेम आईडी',
  type: 'text',
  regex: 'CLAIM_ID',
  required: true,
  maxLength: 20,
};

const CLAIM_DATE_FIELD = {
  key: 'claimDate',
  label: 'Claim Date',
  labelHi: 'क्लेम तिथि',
  type: 'date',
  required: true,
  mode: 'date',
};

const DOCTOR_FIELD = {
    key: 'doctorName',
    label: 'Doctor Name',
    labelHi: 'डॉक्टर का नाम',
    type: 'name',
    regex: 'NAME',
    required: false,
    maxLength: 60,
};

const FOLLOWUP_FIELD = {
  key: 'followUpDate',
  label: 'Follow-up Date',
  labelHi: 'फॉलो-अप तिथि',
  type: 'date',
  required: true,
  mode: 'date',
};

const DATE_FIELD = {
    key: 'procedureDate',
    label: 'Procedure Date',
    labelHi: 'प्रक्रिया की तिथि',
    type: 'date',
    required: true,
    mode: 'date',
};

export const getFieldsForScheme = schemeKey => {
  switch (schemeKey) {
    case SCHEME_KEYS.MALE_STERILIZATION:
      return [...BASE_FIELDS, DATE_FIELD, DOCTOR_FIELD];
    case SCHEME_KEYS.FEMALE_STERILIZATION:
      return [...BASE_FIELDS, DOCTOR_FIELD];
    case SCHEME_KEYS.COMPENSATION:
      return [...BASE_FIELDS,DATE_FIELD, CLAIM_FIELD, CLAIM_DATE_FIELD];
    case SCHEME_KEYS.ANTARA_INJECTION:
      return [...BASE_FIELDS,FOLLOWUP_FIELD,];
    case SCHEME_KEYS.PPIUCD:
      return [...BASE_FIELDS,DOCTOR_FIELD, FOLLOWUP_FIELD];
    default:
      return BASE_FIELDS;
  }
};