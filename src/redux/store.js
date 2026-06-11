/**
 * Redux store + axios 401 → logout wiring.
 *
 * The app is online-only, so no redux-persist. Only the auth token and
 * language preference are persisted (in AsyncStorage). All other state
 * is rehydrated from the server.
 */

import {configureStore} from '@reduxjs/toolkit';

import {setUnauthorizedHandler} from '../api/axiosInstance';
import {showToast} from '../components/Toast';
import authReducer, {forceLogout, logout} from './slices/authSlice';
import beneficiaryReducer, {resetBeneficiary} from './slices/beneficiarySlice';
import facilityReducer, {resetFacilities} from './slices/facilitySlice';
import reportReducer, {resetReport} from './slices/reportSlice';
import schemeReducer, {resetSchemes} from './slices/schemeSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    facility: facilityReducer,
    scheme: schemeReducer,
    beneficiary: beneficiaryReducer,
    report: reportReducer,
    ui: uiReducer,
  },
  middleware: getDefault =>
    getDefault({
      serializableCheck: {
        // Date objects flow through the create/update path.
        ignoredActionPaths: [
          'payload.procedureDate',
          'payload.followUpDate',
          'meta.arg.image',
        ],
        ignoredPaths: ['beneficiary.draft', 'beneficiary.current'],
      },
    }),
});

/* -------------------------------------------------------------------------- */
/*  401 handler                                                                */
/* -------------------------------------------------------------------------- */
/* When the API returns 401 the axios interceptor invokes this handler. We     */
/* fire & forget the logout thunk + reset all auth-scoped slices.              */
/* -------------------------------------------------------------------------- */

setUnauthorizedHandler(() => {
  // forceLogout updates the navigator immediately; the logout thunk
  // then clears AsyncStorage in the background.
  store.dispatch(forceLogout());
  store.dispatch(logout());
  store.dispatch(resetBeneficiary());
  store.dispatch(resetFacilities());
  store.dispatch(resetSchemes());
  store.dispatch(resetReport());
  showToast({type: 'error', message: 'Session expired. Please log in again.'});
});
