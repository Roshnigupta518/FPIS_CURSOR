/**
 * Facility slice.
 *
 *  Async thunks
 *  ────────────
 *    fetchFacilities  — GET /facilities (role-filtered on the backend)
 *
 *  State shape
 *  ───────────
 *    { items[], selected, loading, error, preselect }
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';

import {listFacilitiesApi} from '../../api/facilityApi';

export const fetchFacilities = createAsyncThunk(
  'facility/fetch',
  async (_, {rejectWithValue}) => {
    try {
      return await listFacilitiesApi();
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load facilities');
    }
  },
);

const initialState = {
  items: [],
  selected: null,
  loading: false,
  error: null,
  preselect: false,
};

const facilitySlice = createSlice({
  name: 'facility',
  initialState,
  reducers: {
    setFacility(state, action) {
      state.selected = action.payload;
    },
    clearFacility(state) {
      state.selected = null;
    },
    resetFacilities() {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchFacilities.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFacilities.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.preselect = Boolean(action.payload.meta?.preselect);
        // Auto-select the preselected facility (district/medical) if
        // none is selected yet — the user still has to tap Continue.
        if (!state.selected) {
          const pre = state.items.find(f => f.preselected);
          if (pre) state.selected = pre;
        }
      })
      .addCase(fetchFacilities.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load facilities';
      });
  },
});

export const {setFacility, clearFacility, resetFacilities} =
  facilitySlice.actions;
export default facilitySlice.reducer;
