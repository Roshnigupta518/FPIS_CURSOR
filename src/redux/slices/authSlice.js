/**
 * Auth slice.
 *
 *  Async thunks
 *  ────────────
 *    login        — POST /auth/login, stores token + user, persists to AsyncStorage
 *    bootstrapAuth — rehydrates token/user on app launch (no network call)
 *    logout       — clears redux + AsyncStorage; called on user action and on 401
 *
 *  State shape
 *  ───────────
 *    {
 *      isAuthenticated, bootstrapping,
 *      user: {id, name, mobile, role, facility:{id,name,type,district}},
 *      token, loginType (UI hint), loading, error
 *    }
 */

import {createAsyncThunk, createSlice} from '@reduxjs/toolkit';

import {loginApi} from '../../api/authApi';
import {LOGIN_TYPES} from '../../constants/facilities';
import {getItem, removeItem, setItem, StorageKeys} from '../../utils/storage';

/* -------------------------------------------------------------------------- */
/*  Async thunks                                                               */
/* -------------------------------------------------------------------------- */

export const login = createAsyncThunk(
  'auth/login',
  async ({mobile, password, loginType}, {rejectWithValue}) => {
    try {
      const data = await loginApi({mobile, password});
      console.log({loginData: JSON.stringify(data)})
      await setItem(StorageKeys.AUTH_TOKEN, data.token);
      await setItem(StorageKeys.USER, data.user);
      return {...data, loginType};
    } catch (err) {
      return rejectWithValue(err?.message || 'Invalid credentials');
    }
  },
);

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const [token, user] = await Promise.all([
    getItem(StorageKeys.AUTH_TOKEN),
    getItem(StorageKeys.USER, true),
  ]);
  if (!token || !user) return null;
  return {token, user};
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await removeItem(StorageKeys.AUTH_TOKEN);
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
    // Called by axios interceptor on 401 (and by Logout button).
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
        // Sync loginType to whatever role the server returned.
        if (action.payload.user?.role) {
          state.loginType = action.payload.user.role;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Login failed';
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
