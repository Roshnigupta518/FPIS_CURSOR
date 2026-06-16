/**
 * Report slice.
 *
 *  Async thunks
 *  ────────────
 *    fetchMyReportSummary({reset})         — pulls /reports/my-summary
 *                                             using the current filters
 *    fetchMyReportBeneficiaries({reset})   — pulls the beneficiary rows
 *                                             behind the summary (date
 *                                             range + scheme filter)
 *    downloadMyReportExcel()               — pulls the .xlsx binary using
 *                                             the current filters; returns
 *                                             the base64 + filename so
 *                                             the screen layer can hand
 *                                             it to the Share sheet
 *
 *  State shape
 *  ───────────
 *    {
 *      summary: {
 *        period, from, to, schemeId, total,
 *        byStatus: { PENDING_AUTH, AUTH_SUCCESS, AUTH_FAILED, SUBMITTED },
 *        byScheme: [{ id, code, name, count }, ...]
 *      } | null,
 *      items: Beneficiary[],          // list rendered below the breakdown
 *      itemsTotal,                    // server-reported total (paged)
 *      filters: { period, from, to, schemeId },
 *      loading, refreshing, error,
 *      itemsLoading, itemsError,
 *      downloading, downloadError,
 *    }
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';

import {
  downloadMyReportExcelApi,
  getMyReportBeneficiariesApi,
  getMyReportSummaryApi,
} from '../../api/reportApi';

/* -------------------------------------------------------------------------- */
/*  Thunks                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The deployed backend takes `userId` as an explicit query param (it
 * doesn't rely on the JWT to scope the report). Pull the current user
 * from auth state and merge it into the filters here so the API layer
 * doesn't need to reach back into the store.
 */
const buildFiltersWithUser = state => {
  const filters = state.report.filters;
  const user = state.auth?.user;
  const userId =
    user?.id ?? user?.userId ?? user?.user_id ?? user?.UserID ?? null;
  return {...filters, userId};
};

export const fetchMyReportSummary = createAsyncThunk(
  'report/fetchMySummary',
  async ({reset = false} = {}, {getState, rejectWithValue}) => {
    try {
      const filters = buildFiltersWithUser(getState());
      const data = await getMyReportSummaryApi(filters);
      return {data, reset};
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load report');
    }
  },
);

export const fetchMyReportBeneficiaries = createAsyncThunk(
  'report/fetchMyBeneficiaries',
  async ({reset = false} = {}, {getState, rejectWithValue}) => {
    try {
      const filters = buildFiltersWithUser(getState());
      const data = await getMyReportBeneficiariesApi(filters);
      return {data, reset};
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load beneficiary list');
    }
  },
);

export const downloadMyReportExcel = createAsyncThunk(
  'report/downloadExcel',
  async (_, {getState, rejectWithValue}) => {
    try {
      const filters = buildFiltersWithUser(getState());
      return await downloadMyReportExcelApi(filters);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to generate report');
    }
  },
);

/* -------------------------------------------------------------------------- */
/*  Slice                                                                      */
/* -------------------------------------------------------------------------- */

const initialState = {
  summary: null,

  items: [],
  itemsTotal: 0,

  filters: {
    period: 'today', // today | week | month | all | custom
    from: null, // ISO string when period === 'custom'
    to: null,
    schemeId: null, // null = all schemes
  },

  loading: false,
  refreshing: false,
  error: null,

  itemsLoading: false,
  itemsError: null,

  downloading: false,
  downloadError: null,
};

const reportSlice = createSlice({
  name: 'report',
  initialState,
  reducers: {
    setReportFilters(state, action) {
      state.filters = {...state.filters, ...action.payload};
    },
    clearReportError(state) {
      state.error = null;
      state.downloadError = null;
    },
    resetReport() {
      return initialState;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchMyReportSummary.pending, (state, action) => {
        const reset = action.meta.arg?.reset ?? false;
        if (reset && state.summary) {
          state.refreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchMyReportSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.summary = action.payload.data;
      })
      .addCase(fetchMyReportSummary.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.payload || 'Failed to load report';
      });

    builder
      .addCase(fetchMyReportBeneficiaries.pending, state => {
        state.itemsLoading = true;
        state.itemsError = null;
      })
      .addCase(fetchMyReportBeneficiaries.fulfilled, (state, action) => {
        state.itemsLoading = false;
        state.items = action.payload.data?.items || [];
        state.itemsTotal = action.payload.data?.total ?? state.items.length;
      })
      .addCase(fetchMyReportBeneficiaries.rejected, (state, action) => {
        state.itemsLoading = false;
        state.itemsError = action.payload || 'Failed to load list';
      });

    builder
      .addCase(downloadMyReportExcel.pending, state => {
        state.downloading = true;
        state.downloadError = null;
      })
      .addCase(downloadMyReportExcel.fulfilled, state => {
        state.downloading = false;
      })
      .addCase(downloadMyReportExcel.rejected, (state, action) => {
        state.downloading = false;
        state.downloadError = action.payload || 'Download failed';
      });
  },
});

export const {setReportFilters, clearReportError, resetReport} =
  reportSlice.actions;

export default reportSlice.reducer;
