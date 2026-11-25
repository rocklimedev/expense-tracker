import { configureStore, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tokenStore } from './api';
import { serverApi } from './server-api';

const session = createSlice({
  name: 'session',
  initialState: { signedIn: Boolean(tokenStore.get()) },
  reducers: {
    setSignedIn(state, action: PayloadAction<boolean>) {
      state.signedIn = action.payload;
    },
  },
});

export const { setSignedIn } = session.actions;

export const store = configureStore({
  reducer: { session: session.reducer, [serverApi.reducerPath]: serverApi.reducer },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(serverApi.middleware),
  devTools: false,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
