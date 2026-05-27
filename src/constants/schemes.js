/**
 * Scheme master data, facility -> scheme mapping, and dynamic form
 * field definitions used by the Beneficiary Form screen.
 */

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

/**
 * Scheme availability per facility type. Centralized here so screens
 * and reports can share the same source of truth.
 */
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

/* -------------------------------------------------------------------------- */
/*  BENEFICIARY STATUS                                                         */
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
/*  DYNAMIC FORM FIELD DEFINITIONS                                             */
/* -------------------------------------------------------------------------- */

/**
 * Field configuration consumed by the BeneficiaryForm screen.
 * Each entry maps to a reusable MyInput / DatePickerField component.
 *
 * key            - state key on the form
 * label/labelHi  - i18n-aware labels
 * type           - one of: text | number | date | name
 * regex          - key into utils/validation RegexType map
 * required       - boolean
 * keyboardType   - RN keyboardType
 * maxLength      - optional cap
 */
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
    required: true,
    keyboardType: 'phone-pad',
    maxLength: 10,
  },
  {
    key: 'address',
    label: 'Address',
    labelHi: 'पता',
    type: 'text',
    regex: 'ADDRESS',
    required: true,
    multiline: true,
    maxLength: 200,
  },
  {
    key: 'procedureDate',
    label: 'Procedure Date',
    labelHi: 'प्रक्रिया की तिथि',
    type: 'date',
    required: true,
    mode: 'date',
  },
  {
    key: 'doctorName',
    label: 'Doctor Name',
    labelHi: 'डॉक्टर का नाम',
    type: 'name',
    regex: 'NAME',
    required: true,
    maxLength: 60,
  },
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

const FOLLOWUP_FIELD = {
  key: 'followUpDate',
  label: 'Follow-up Date',
  labelHi: 'फॉलो-अप तिथि',
  type: 'date',
  required: false,
  mode: 'date',
};

/**
 * Returns the ordered list of form fields for a given scheme.
 * Some fields (claim id, follow-up) are scheme-specific.
 */
export const getFieldsForScheme = schemeKey => {
  switch (schemeKey) {
    case SCHEME_KEYS.MALE_STERILIZATION:
    case SCHEME_KEYS.FEMALE_STERILIZATION:
      return [...BASE_FIELDS, FOLLOWUP_FIELD, CLAIM_FIELD];
    case SCHEME_KEYS.COMPENSATION:
      return [...BASE_FIELDS, CLAIM_FIELD];
    case SCHEME_KEYS.ANTARA_INJECTION:
      return [...BASE_FIELDS, FOLLOWUP_FIELD];
    case SCHEME_KEYS.PPIUCD:
      return [...BASE_FIELDS, FOLLOWUP_FIELD];
    default:
      return BASE_FIELDS;
  }
};
