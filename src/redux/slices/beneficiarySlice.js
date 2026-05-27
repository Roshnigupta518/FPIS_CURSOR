/**
 * Beneficiary slice.
 *
 *  Async thunks
 *  ────────────
 *    fetchBeneficiaries({reset})       — first page / pull-to-refresh
 *    fetchMoreBeneficiaries()          — next page (FlatList onEndReached)
 *    fetchBeneficiaryById(id)
 *    createBeneficiary(form)
 *    updateBeneficiary({id, form})
 *    deleteBeneficiary(id)
 *    runFaceAuth({beneficiaryId, status, image})
 *
 *  List state shape
 *  ────────────────
 *    items, page, limit, total, totalPages, hasMore,
 *    loading, refreshing, loadingMore, error,
 *    filters: {search, status, schemeId, facilityId, dateFrom, dateTo}
 *
 *  Draft state shape
 *  ────────────────
 *    draft, submitting, submitError
 *    (carried between Form → Face Auth → Final Submit)
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';

import {
  createBeneficiaryApi,
  deleteBeneficiaryApi,
  faceAuthApi,
  getBeneficiaryByIdApi,
  listBeneficiariesApi,
  updateBeneficiaryApi,
} from '../../api/beneficiaryApi';

const DEFAULT_LIMIT = 10;

/* -------------------------------------------------------------------------- */
/*  Thunks                                                                     */
/* -------------------------------------------------------------------------- */

export const fetchBeneficiaries = createAsyncThunk(
  'beneficiary/fetch',
  async ({reset = true, filters} = {}, {getState, rejectWithValue}) => {
    try {
      const state = getState().beneficiary;
      const activeFilters = filters || state.filters;
      const res = await listBeneficiariesApi({
        ...activeFilters,
        page: 1,
        limit: state.limit || DEFAULT_LIMIT,
      });
      return {...res, reset, filters: activeFilters};
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load beneficiaries');
    }
  },
);

export const fetchMoreBeneficiaries = createAsyncThunk(
  'beneficiary/fetchMore',
  async (_, {getState, rejectWithValue}) => {
    try {
      const {page, limit, hasMore, filters, loadingMore} =
        getState().beneficiary;
      if (!hasMore || loadingMore) return null;
      const nextPage = page + 1;
      const res = await listBeneficiariesApi({
        ...filters,
        page: nextPage,
        limit,
      });
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load more');
    }
  },
);

export const fetchBeneficiaryById = createAsyncThunk(
  'beneficiary/fetchById',
  async (id, {rejectWithValue}) => {
    try {
      return await getBeneficiaryByIdApi(id);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load beneficiary');
    }
  },
);

export const createBeneficiary = createAsyncThunk(
  'beneficiary/create',
  async (form, {rejectWithValue}) => {
    try {
      return await createBeneficiaryApi(form);
    } catch (err) {
      return rejectWithValue({
        message: err?.message || 'Failed to save',
        errors: err?.errors,
      });
    }
  },
);

export const updateBeneficiary = createAsyncThunk(
  'beneficiary/update',
  async ({id, form}, {rejectWithValue}) => {
    try {
      return await updateBeneficiaryApi(id, form);
    } catch (err) {
      return rejectWithValue({
        message: err?.message || 'Failed to update',
        errors: err?.errors,
      });
    }
  },
);

export const deleteBeneficiary = createAsyncThunk(
  'beneficiary/delete',
  async (id, {rejectWithValue}) => {
    try {
      await deleteBeneficiaryApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to delete');
    }
  },
);

export const runFaceAuth = createAsyncThunk(
  'beneficiary/faceAuth',
  async ({beneficiaryId, status, image}, {rejectWithValue}) => {
    try {
      return await faceAuthApi({beneficiaryId, status, image});
    } catch (err) {
      return rejectWithValue(err?.message || 'Face authentication failed');
    }
  },
);

/* -------------------------------------------------------------------------- */
/*  Slice                                                                      */
/* -------------------------------------------------------------------------- */

const initialState = {
  items: [],
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
  hasMore: false,

  loading: false,
  refreshing: false,
  loadingMore: false,
  error: null,

  filters: {
    search: '',
    status: null,
    schemeId: null,
    facilityId: null,
    dateFrom: null,
    dateTo: null,
  },

  current: null,         // detail view
  loadingCurrent: false,

  draft: null,           // in-flight form → face auth → submit
  submitting: false,
  submitError: null,
  fieldErrors: null,

  deletingId: null,
  faceAuthing: false,
};

const beneficiarySlice = createSlice({
  name: 'beneficiary',
  initialState,
  reducers: {
    setDraft(state, action) {
      state.draft = action.payload;
    },
    clearDraft(state) {
      state.draft = null;
      state.submitError = null;
      state.fieldErrors = null;
    },
    setFilters(state, action) {
      state.filters = {...state.filters, ...action.payload};
    },
    clearFilters(state) {
      state.filters = initialState.filters;
    },
    upsertLocal(state, action) {
      const entry = action.payload;
      const idx = state.items.findIndex(i => i.id === entry.id);
      if (idx >= 0) state.items[idx] = {...state.items[idx], ...entry};
      else state.items.unshift(entry);
    },
    removeLocal(state, action) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    resetBeneficiary() {
      return initialState;
    },
  },
  extraReducers: builder => {
    /* ------ list ------ */
    builder
      .addCase(fetchBeneficiaries.pending, (state, action) => {
        const reset = action.meta.arg?.reset ?? true;
        if (reset && state.items.length) state.refreshing = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(fetchBeneficiaries.fulfilled, (state, action) => {
        const {items, meta, filters} = action.payload;
        state.loading = false;
        state.refreshing = false;
        state.items = items;
        state.page = meta.page || 1;
        state.limit = meta.limit || state.limit;
        state.total = meta.total || items.length;
        state.totalPages = meta.totalPages || 1;
        state.hasMore = Boolean(meta.hasNext);
        if (filters) state.filters = {...state.filters, ...filters};
      })
      .addCase(fetchBeneficiaries.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload || 'Failed to load';
      });

    /* ------ pagination ------ */
    builder
      .addCase(fetchMoreBeneficiaries.pending, state => {
        state.loadingMore = true;
      })
      .addCase(fetchMoreBeneficiaries.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (!action.payload) return;
        const {items, meta} = action.payload;
        // De-dup by id in case the server returns overlapping rows.
        const seen = new Set(state.items.map(i => i.id));
        const fresh = items.filter(i => !seen.has(i.id));
        state.items = [...state.items, ...fresh];
        state.page = meta.page || state.page + 1;
        state.total = meta.total || state.items.length;
        state.totalPages = meta.totalPages || state.totalPages;
        state.hasMore = Boolean(meta.hasNext);
      })
      .addCase(fetchMoreBeneficiaries.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload || 'Failed to load more';
      });

    /* ------ detail ------ */
    builder
      .addCase(fetchBeneficiaryById.pending, state => {
        state.loadingCurrent = true;
      })
      .addCase(fetchBeneficiaryById.fulfilled, (state, action) => {
        state.loadingCurrent = false;
        state.current = action.payload;
        // Keep the list in sync if it's already there.
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(fetchBeneficiaryById.rejected, state => {
        state.loadingCurrent = false;
      });

    /* ------ create / update ------ */
    const submitPending = state => {
      state.submitting = true;
      state.submitError = null;
      state.fieldErrors = null;
    };
    const submitRejected = (state, action) => {
      state.submitting = false;
      state.submitError = action.payload?.message || 'Failed to save';
      state.fieldErrors = action.payload?.errors || null;
    };

    builder
      .addCase(createBeneficiary.pending, submitPending)
      .addCase(createBeneficiary.fulfilled, (state, action) => {
        state.submitting = false;
        state.draft = action.payload;
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createBeneficiary.rejected, submitRejected)
      .addCase(updateBeneficiary.pending, submitPending)
      .addCase(updateBeneficiary.fulfilled, (state, action) => {
        state.submitting = false;
        state.draft = action.payload;
        state.current = action.payload;
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
      })
      .addCase(updateBeneficiary.rejected, submitRejected);

    /* ------ delete ------ */
    builder
      .addCase(deleteBeneficiary.pending, (state, action) => {
        state.deletingId = action.meta.arg;
      })
      .addCase(deleteBeneficiary.fulfilled, (state, action) => {
        state.deletingId = null;
        state.items = state.items.filter(i => i.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteBeneficiary.rejected, state => {
        state.deletingId = null;
      });

    /* ------ face auth ------ */
    builder
      .addCase(runFaceAuth.pending, state => {
        state.faceAuthing = true;
      })
      .addCase(runFaceAuth.fulfilled, (state, action) => {
        state.faceAuthing = false;
        state.draft = action.payload;
        state.current = action.payload;
        const idx = state.items.findIndex(i => i.id === action.payload.id);
        if (idx >= 0) state.items[idx] = action.payload;
        else state.items.unshift(action.payload);
      })
      .addCase(runFaceAuth.rejected, state => {
        state.faceAuthing = false;
      });
  },
});

export const {
  setDraft,
  clearDraft,
  setFilters,
  clearFilters,
  upsertLocal,
  removeLocal,
  resetBeneficiary,
} = beneficiarySlice.actions;
export default beneficiarySlice.reducer;
