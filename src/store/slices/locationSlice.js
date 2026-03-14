import { createSlice } from '@reduxjs/toolkit';

const locationSlice = createSlice({
  name: 'location',
  initialState: {
    coords: null,
    isInZone: false,
    loading: true,
    error: null,
  },
  reducers: {
    setLocation(state, action) {
      state.coords = action.payload.coords;
      state.isInZone = action.payload.isInZone;
      state.loading = false;
      state.error = null;
    },
    setLocationError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    setLocationLoading(state, action) {
      state.loading = action.payload;
    },
  },
});

export const { setLocation, setLocationError, setLocationLoading } = locationSlice.actions;
export default locationSlice.reducer;
