export const API_BASE_URL = 'https://fwmis.nhmmp.gov.in/FPISAPI/api' //'https://139.5.6.137/FPIS_API_APP/api';

export const REQUEST_TIMEOUT_MS = 20000;
export const UPLOAD_TIMEOUT_MS = 45000;

export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/Auth/login',
    LOGOUT: '/Auth/logout',
    REFRESH_TOKEN: '/Auth/refresh',
    ME: '/auth/me',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD_REQUEST_OTP: '/auth/forgot-password/request-otp',
    FORGOT_PASSWORD_VERIFY_OTP: '/auth/forgot-password/verify-otp',
    FORGOT_PASSWORD_RESET: '/auth/forgot-password/reset',
  },
  FACILITIES: {
    LIST: '/facilities?userId=',
    BY_ID: id => `/facilities/${id}`,
  },
  SCHEMES: {
    LIST: '/schemes?facilityTypeId=',
    BY_FACILITY_TYPE: type => `/schemes/${type}`,
  },
  BENEFICIARIES: {
    LIST: '/beneficiaries',
    BY_ID : id => `/beneficiaries/by-id?BeneficiaryID=${id}`,
    FACE_AUTH: '/beneficiaries/face-auth',
  },
  AADHAAR: {
    PREPARE_REQUEST: '/AadhaarGateway/PrepareRequest?serviceType=',
  },
  REPORTS: {
    MY_SUMMARY: '/reports/my-summary',
    MY_SUMMARY_EXPORT: '/reports/my-summary/export',
    MY_BENEFICIARIES: '/reports/my-beneficiaries',
  },
};
