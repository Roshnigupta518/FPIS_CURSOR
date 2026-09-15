/**
 * Auth slice.
 *
 *  Async thunks
 *  ────────────
 *    login          — POST /Auth/login, stores token + refreshToken + user
 *                     in AsyncStorage. Rejects with a structured
 *                     { code, message, ... } payload so the UI can show
 *                     the right error state (invalid creds, account
 *                     locked, already logged in on another device, rate
 *                     limited, network error).
 *    bootstrapAuth  — rehydrates token/user on app launch (no network call)
 *    logout         — calls /Auth/logout so the server can invalidate the
 *                     session, then clears local state. Also fired by the
 *                     axios 401 handler when refresh fails.
 *
 *  State shape
 *  ───────────
 *    {
 *      isAuthenticated, bootstrapping,
 *      user: {id, name, mobile, role, facility:{id,name,type,district}},
 *      token, loginType (UI hint), loading,
 *      error: { code, message, otherDevice?, loggedInSince? } | null
 *    }
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';

import {loginApi, logoutApi} from '../../api/authApi';
import {LOGIN_TYPES} from '../../constants/facilities';
import {getItem, removeItem, setItem, StorageKeys} from '../../utils/storage';

/* -------------------------------------------------------------------------- */
/*  Async thunks                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Prefer the message the backend actually sent. Only fall back to our
 * hardcoded Hindi copy when the response has no useful message (network
 * error, empty body, generic 5xx without a JSON envelope, etc.).
 *
 * Some backends wrap the technical error message inside `error` /
 * `error_description` / `errors[0]` — we peek at all of those before
 * giving up.
 */
const pickBackendMessage = err => {
  const raw =
    err?.message ||
    err?.data?.message ||
    err?.data?.error ||
    err?.data?.error_description ||
    (Array.isArray(err?.errors) && err.errors[0]) ||
    err?.errors?.[0]?.message;

  if (!raw) {
    return null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  // Axios sends "Network Error" / "Request failed with status code XXX"
  // as `err.message` — those aren't real backend messages, so treat as
  // "no message" and let our hardcoded fallback take over.
  if (
    /^network error$/i.test(trimmed) ||
    /^request failed with status code /i.test(trimmed) ||
    /^timeout of /i.test(trimmed)
  ) {
    return null;
  }
  return trimmed;
};

const mapErrorToPayload = err => {
  const status = err?.status || 0;
  const backendMessage = pickBackendMessage(err);

  if (status === 401 || status === 400) {
    return {
      code: 'INVALID_CREDENTIALS',
      message:
        backendMessage || 'गलत User ID या Password। कृपया दुबारा try करें।',
    };
  }
  if (status === 423) {
    return {
      code: 'ACCOUNT_LOCKED',
      message:
        backendMessage ||
        'बहुत सारे गलत attempts के कारण account 30 मिनट के लिए lock हो गया है।',
    };
  }
  if (status === 409 && err?.errorCode === 'SESSION_ACTIVE_ON_OTHER_DEVICE') {
    return {
      code: 'ALREADY_LOGGED_IN',
      message:
        backendMessage ||
        'आप पहले से किसी अन्य device पर logged in हैं। ' +
          'कृपया पहले उस device पर Logout button दबाएं, फिर यहाँ login करें।',
      otherDevice: err?.data?.otherDevice,
      loggedInSince: err?.data?.loggedInSince,
    };
  }
  if (status === 429) {
    return {
      code: 'TOO_MANY_ATTEMPTS',
      message:
        backendMessage || 'बहुत ज़्यादा attempts हो गए। कुछ मिनट बाद try करें।',
    };
  }
  if (status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: backendMessage || 'Server में समस्या है। थोड़ी देर बाद try करें।',
    };
  }
  if (status === 0) {
    if (__DEV__) {
      console.warn('[AuthApi Debug] Network request failed (status 0):', err);
    }
    const devDetails = __DEV__ && err?.message ? ` (Debug: ${err.message})` : '';
    return {
      code: 'NETWORK_ERROR',
      message:
        (backendMessage || 'Internet connection नहीं है। कृपया network check करें।') + devDetails,
    };
  }
  return {
    code: 'UNKNOWN',
    message: backendMessage || 'कुछ गड़बड़ हुई। दुबारा try करें।',
  };
};

export const login = createAsyncThunk(
  'auth/login',
  async ({userId, password}, {rejectWithValue}) => {
    try {
      const response = await loginApi({userId, password});

      if (!response?.success || !response?.data) {
        return rejectWithValue({
          code: 'LOGIN_FAILED',
          message: response?.message || 'Invalid User ID or Password',
        });
      }

      await setItem(StorageKeys.AUTH_TOKEN, response.data.token);
      if (response.data.refreshToken) {
        await setItem(StorageKeys.REFRESH_TOKEN, response.data.refreshToken);
      }
      await setItem(StorageKeys.USER, response.data.user);

      return response.data;
    } catch (err) {
      return rejectWithValue(mapErrorToPayload(err));
    }
  },
);

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const [token, user] = await Promise.all([
    getItem(StorageKeys.AUTH_TOKEN),
    getItem(StorageKeys.USER, true),
  ]);
  if (!token || !user) {
    return null;
  }
  return {token, user};
});

export const logout = createAsyncThunk('auth/logout', async () => {
  // Best-effort: tell the server so the session record gets deactivated
  // and the user can immediately log in from another device. If the
  // network call fails (offline, server down) we still clear locally.
  try {
    await logoutApi();
  } catch (_e) {
    /* swallow */
  }
  await removeItem(StorageKeys.AUTH_TOKEN);
  await removeItem(StorageKeys.REFRESH_TOKEN);
  await removeItem(StorageKeys.USER);
});

/* -------------------------------------------------------------------------- */
/*  Slice                                                                      */
/* -------------------------------------------------------------------------- */

const initialState = {
  isAuthenticated: false,
  bootstrapping: true,
  user: null,
  token: null,
  loginType: LOGIN_TYPES.BLOCK,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoginType(state, action) {
      state.loginType = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
    // Called by axios interceptor when refresh also fails.
    forceLogout(state) {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        if (action.payload.user?.role) {
          state.loginType = action.payload.user.role;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || {
          code: 'UNKNOWN',
          message: 'Login failed',
        };
      })
      .addCase(bootstrapAuth.pending, state => {
        state.bootstrapping = true;
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.bootstrapping = false;
        if (action.payload) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
          state.user = action.payload.user;
          if (action.payload.user?.role) {
            state.loginType = action.payload.user.role;
          }
        }
      })
      .addCase(bootstrapAuth.rejected, state => {
        state.bootstrapping = false;
      })
      .addCase(logout.fulfilled, () => ({
        ...initialState,
        bootstrapping: false,
      }));
  },
});

export const {setLoginType, clearAuthError, forceLogout} = authSlice.actions;
export default authSlice.reducer;
