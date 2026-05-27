/**
 * UI slice for app-level concerns: language and toast queue.
 */

import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  language: 'en',
  toast: null, // { type: 'success' | 'error' | 'info', message }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage(state, action) {
      state.language = action.payload;
    },
    showToast(state, action) {
      state.toast = action.payload;
    },
    hideToast(state) {
      state.toast = null;
    },
  },
});

export const {setLanguage, showToast, hideToast} = uiSlice.actions;
export default uiSlice.reducer;
