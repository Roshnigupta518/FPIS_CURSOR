/**
 * Scheme slice.
 *
 *  Async thunks
 *  ────────────
 *    fetchSchemes(facilityType)   — GET /schemes/:facilityType
 *
 *  State shape
 *  ───────────
 *    {
 *      items[], selected, loading, error,
 *      lastFacilityType,         // small in-memory cache so navigating
 *                                // back doesn't trigger an extra fetch.
 *    }
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';

import {listSchemesByFacilityTypeApi} from '../../api/schemeApi';

export const fetchSchemes = createAsyncThunk(
  'scheme/fetch',
  async (facilityTypeId, {rejectWithValue}) => {
    try {
      const items = await listSchemesByFacilityTypeApi(facilityTypeId);
      return {facilityTypeId, items};
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load schemes');
    }
  },
);

const initialState = {
  items: [],
  selected: null,
  loading: false,
  error: null,
  lastFacilityType: null,
};

const schemeSlice = createSlice({
  name: 'scheme',
  initialState,
  reducers: {
    setScheme(state, action) {
      state.selected = action.payload;
    },
    clearScheme(state) {
      state.selected = null;
    },
    resetSchemes() {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchSchemes.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchemes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.lastFacilityType = action.payload.facilityType;
      })
      .addCase(fetchSchemes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load schemes';
      });
  },
});

export const {setScheme, clearScheme, resetSchemes} = schemeSlice.actions;
export default schemeSlice.reducer;
